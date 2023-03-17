import { GameInfo, GameSettings, Runner } from 'common/types'
import { GameConfig } from '../../game_config'
import { isMac, isLinux, gamesConfigPath, icon } from '../../constants'
import { logInfo, LogPrefix, logWarning } from '../../logger/logger'
import path, { dirname, join, resolve } from 'path'
import { appendFileSync, constants as FS_CONSTANTS } from 'graceful-fs'
import i18next from 'i18next'
import {
  callRunner,
  launchCleanup,
  prepareLaunch,
  runWineCommand,
  setupEnvVars,
  setupWrappers
} from '../../launcher'
import { access, chmod } from 'fs/promises'
import shlex from 'shlex'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { createAbortController } from '../../utils/aborthandler/aborthandler'
import { app, BrowserWindow } from 'electron'
import { gameManagerMap } from '../index'
import find from 'find-process'
import { OverlayApp } from 'backend/overlay/overlay'
const buildDir = resolve(__dirname, '../../build')

export async function getAppSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export function logFileLocation(appName: string) {
  return join(gamesConfigPath, `${appName}-lastPlay.log`)
}

const openNewBrowserGameWindow = async (
  browserUrl: string
): Promise<boolean> => {
  return new Promise((res) => {
    const browserGame = new BrowserWindow({
      icon: icon,
      webPreferences: {
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    const url = !app.isPackaged
      ? 'http://localhost:5173?view=BrowserGame&browserUrl=' +
        encodeURIComponent(browserUrl)
      : `file://${path.join(
          buildDir,
          './index.html?view=BrowserGame&browserUrl=' +
            encodeURIComponent(browserUrl)
        )}`

    browserGame.loadURL(url)
    setTimeout(() => browserGame.focus(), 200)
    browserGame.on('close', () => {
      res(true)
    })
  })
}

export function getGameProcessName(gameInfo: GameInfo): string | undefined {
  const installedPlatform = gameInfo.install.platform
  if (installedPlatform === undefined) return
  return gameInfo.releaseMeta?.platforms[installedPlatform]?.processName
}

async function injectProcess(gameInfo: GameInfo) {
  const processNameToInject = getGameProcessName(gameInfo)
  if (processNameToInject === undefined) return

  find('name', processNameToInject, true).then((val) => {
    console.log('found this with process name = ', JSON.stringify(val, null, 4))
    for (const process_i of val) {
      const pidToInject = process_i.pid
      logInfo(`Injecting pid = ${pidToInject}`, LogPrefix.HyperPlay)
      OverlayApp.inject({ pid: pidToInject.toString() })
    }
  })
}

export async function launchGame(
  appName: string,
  gameInfo: GameInfo,
  runner: Runner
): Promise<boolean> {
  if (!gameInfo) {
    return false
  }

  let {
    install: { executable }
  } = gameInfo

  const { browserUrl } = gameInfo

  const gameSettingsOverrides = await GameConfig.get(appName).getSettings()
  if (
    gameSettingsOverrides.targetExe !== undefined &&
    gameSettingsOverrides.targetExe !== ''
  ) {
    executable = gameSettingsOverrides.targetExe
  }

  if (browserUrl) {
    return openNewBrowserGameWindow(browserUrl)
  }

  const gameSettings = await getAppSettings(appName)
  const { launcherArgs } = gameSettings

  if (executable) {
    const isNative = gameManagerMap[runner].isNative(appName)
    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      rpcClient,
      mangoHudCommand,
      gameModeBin,
      steamRuntime
    } = await prepareLaunch(gameSettings, gameInfo, isNative)

    const wrappers = setupWrappers(
      gameSettings,
      mangoHudCommand,
      gameModeBin,
      steamRuntime?.length ? [...steamRuntime] : undefined
    )

    if (!launchPrepSuccess) {
      appendFileSync(
        logFileLocation(appName),
        `Launch aborted: ${launchPrepFailReason}`
      )
      showDialogBoxModalAuto({
        title: i18next.t('box.error.launchAborted', 'Launch aborted'),
        message: launchPrepFailReason!,
        type: 'ERROR'
      })
      return false
    }
    const env = { ...process.env, ...setupEnvVars(gameSettings) }

    // Native
    if (isNative) {
      logInfo(
        `launching native sideloaded or hyperplay store game: ${executable} ${
          launcherArgs ?? ''
        }`,
        LogPrefix.Backend
      )

      try {
        await access(executable, FS_CONSTANTS.X_OK)
      } catch (error) {
        logWarning(
          'File not executable, changing permissions temporarilly',
          LogPrefix.Backend
        )
        // On Mac, it gives an error when changing the permissions of the file inside the app bundle. But we need it for other executables like scripts.
        if (isLinux || (isMac && !executable.endsWith('.app'))) {
          await chmod(executable, 0o775)
        }
      }

      const commandParts = shlex.split(launcherArgs ?? '')

      if (runner === 'hyperplay') {
        //some games take a while to launch. 8 seconds seems to work well
        setTimeout(async () => injectProcess(gameInfo), 8000)
      }

      await callRunner(
        commandParts,
        {
          name: runner,
          logPrefix: LogPrefix.Backend,
          bin: executable,
          dir: dirname(executable)
        },
        createAbortController(appName),
        {
          env,
          wrappers,
          logFile: logFileLocation(appName),
          logMessagePrefix: LogPrefix.Backend
        },
        runner === 'sideload' ? true : false
      )

      launchCleanup(rpcClient)
      // TODO: check and revert to previous permissions
      if (isLinux || (isMac && !executable.endsWith('.app'))) {
        await chmod(executable, 0o775)
      }
      return true
    }

    logInfo(
      `launching non-native sideloaded: ${executable}}`,
      LogPrefix.Backend
    )

    await runWineCommand({
      commandParts: [executable, launcherArgs ?? ''],
      gameSettings,
      wait: false,
      startFolder: dirname(executable),
      options: {
        wrappers,
        logFile: logFileLocation(appName),
        logMessagePrefix: LogPrefix.Backend
      }
    })

    launchCleanup(rpcClient)

    return true
  }
  return false
}
