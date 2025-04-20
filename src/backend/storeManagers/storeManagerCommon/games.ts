import { GameInfo, GameSettings, Runner } from 'common/types'
import { GameConfig } from '../../game_config'
import { isMac, isLinux, icon } from '../../constants'
import {
  appendGamePlayLog,
  appendWinetricksGamePlayLog,
  lastPlayLogFileLocation,
  logInfo,
  LogPrefix,
  logWarning
} from '../../logger/logger'
import { basename, dirname } from 'path'
import { constants as FS_CONSTANTS } from 'graceful-fs'
import i18next from 'i18next'
import {
  callRunner,
  getKnownFixesEnvVariables,
  launchCleanup,
  prepareLaunch,
  prepareWineLaunch,
  runWineCommand,
  setupEnvVars,
  setupWrapperEnvVars,
  setupWrappers
} from '../../launcher'
import { access, chmod } from 'fs/promises'
import shlex from 'shlex'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { BrowserWindow, dialog, Menu } from 'electron'
import { gameManagerMap } from '../index'
import { sendGameStatusUpdate } from 'backend/utils'

async function getAppSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

type BrowserGameOptions = {
  browserUrl: string
  abortId: string
  customUserAgent?: string
  launchFullScreen?: boolean
}

const openNewBrowserGameWindow = async ({
  browserUrl,
  abortId,
  customUserAgent,
  launchFullScreen
}: BrowserGameOptions): Promise<boolean> => {
  const hostname = new URL(browserUrl).hostname

  return new Promise((res) => {
    const browserGame = new BrowserWindow({
      icon: icon,
      fullscreen: launchFullScreen ?? false,
      autoHideMenuBar: true,
      webPreferences: {
        partition: `persist:${hostname}`
      }
    })

    browserGame.setMenu(
      Menu.buildFromTemplate([
        { role: 'close' },
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ])
    )

    const defaultUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    browserGame.webContents.userAgent = customUserAgent ?? defaultUserAgent

    browserGame.menuBarVisible = false
    browserGame.loadURL(browserUrl)
    browserGame.on('ready-to-show', () => browserGame.show())

    const abortController = createAbortController(abortId)

    abortController.signal.addEventListener('abort', () => {
      browserGame.close()
    })

    browserGame.webContents.on('will-prevent-unload', (event) => {
      const choice = dialog.showMessageBoxSync(browserGame, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: i18next.t(
          'box.warning.sideload.confirmExit.title',
          'Are you sure you want to quit?'
        ),
        message: i18next.t(
          'box.warning.sideload.confirmExit.message',
          'Any unsaved progress might be lost'
        ),
        defaultId: 0,
        cancelId: 1
      })
      const leave = choice === 0
      if (leave) {
        event.preventDefault()
      }
    })

    browserGame.on('closed', () => {
      deleteAbortController(abortId)
      res(true)
    })
  })
}

export async function launchGame(
  appName: string,
  gameInfo: GameInfo,
  runner: Runner,
  args: string[] = []
): Promise<boolean> {
  if (!gameInfo) {
    return false
  }

  let {
    install: { executable }
  } = gameInfo

  const { browserUrl, customUserAgent, launchFullScreen } = gameInfo

  const gameSettingsOverrides = await GameConfig.get(appName).getSettings()
  if (
    gameSettingsOverrides.targetExe !== undefined &&
    gameSettingsOverrides.targetExe !== ''
  ) {
    executable = gameSettingsOverrides.targetExe
  }

  if (browserUrl) {
    return openNewBrowserGameWindow({
      browserUrl,
      abortId: appName,
      customUserAgent,
      launchFullScreen
    })
  }

  const gameSettings = await getAppSettings(appName)
  const { launcherArgs } = gameSettings
  const extraArgs = [...shlex.split(launcherArgs ?? ''), ...args]
  const extraArgsJoined = extraArgs.join(' ')

  if (executable) {
    const isNative = gameManagerMap[runner].isNative(appName)
    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      rpcClient,
      mangoHudCommand,
      gameScopeCommand,
      gameModeBin,
      steamRuntime
    } = await prepareLaunch(gameSettings, gameInfo, isNative)

    if (!isNative) {
      await prepareWineLaunch(runner, appName)
      appendWinetricksGamePlayLog(gameInfo)
    }

    const wrappers = setupWrappers(
      gameSettings,
      mangoHudCommand,
      gameModeBin,
      gameScopeCommand,
      steamRuntime?.length ? [...steamRuntime] : undefined
    )

    if (!launchPrepSuccess) {
      appendGamePlayLog(gameInfo, `Launch aborted: ${launchPrepFailReason}`)
      launchCleanup()
      showDialogBoxModalAuto({
        title: i18next.t('box.error.launchAborted', 'Launch aborted'),
        message: launchPrepFailReason!,
        type: 'ERROR'
      })
      return false
    }

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'playing'
    })

    // Native
    if (isNative) {
      logInfo(
        `launching native sideloaded game: ${executable} ${extraArgsJoined}`,
        LogPrefix.Backend
      )

      try {
        await access(executable, FS_CONSTANTS.X_OK)
      } catch {
        logWarning(
          'File not executable, changing permissions temporarily',
          LogPrefix.Backend
        )
        // On Mac, it gives an error when changing the permissions of the file inside the app bundle. But we need it for other executables like scripts.
        if (isLinux || (isMac && !executable.endsWith('.app'))) {
          await chmod(executable, 0o775)
        }
      }

      const env = {
        ...process.env,
        ...setupWrapperEnvVars({ appName, appRunner: runner }),
        ...setupEnvVars(gameSettings, gameInfo.install.install_path),
        ...getKnownFixesEnvVariables(appName, runner)
      }

      await callRunner(
        extraArgs,
        {
          name: runner,
          logPrefix: LogPrefix.Backend,
          bin: basename(executable),
          dir: dirname(executable)
        },
        {
          env,
          wrappers,
          logFile: lastPlayLogFileLocation(appName),
          logMessagePrefix: LogPrefix.Backend
        }
      )

      launchCleanup(rpcClient)
      // TODO: check and revert to previous permissions
      if (isLinux || (isMac && !executable.endsWith('.app'))) {
        await chmod(executable, 0o775)
      }
      return true
    }

    logInfo(
      `launching non-native sideloaded: ${executable} ${extraArgsJoined}`,
      LogPrefix.Backend
    )

    await runWineCommand({
      commandParts: [executable, ...extraArgs],
      gameSettings,
      wait: true,
      protonVerb: 'waitforexitandrun',
      startFolder: dirname(executable),
      options: {
        wrappers,
        logFile: lastPlayLogFileLocation(appName),
        logMessagePrefix: LogPrefix.Backend,
        onOutput: (output) => {
          if (gameSettings.verboseLogs) appendGamePlayLog(gameInfo, output)
        }
      }
    })

    launchCleanup(rpcClient)

    return true
  }
  return false
}
