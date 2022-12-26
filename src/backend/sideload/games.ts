import {
  GameSettings,
  GameInfo,
  SideloadGame,
  InstalledInfo
} from '../../common/types'
import { libraryStore } from './electronStores'
import { GameConfig } from '../game_config'
import {
  isWindows,
  isMac,
  isLinux,
  execOptions,
  heroicGamesConfigPath
} from '../constants'
import { execAsync, killPattern, notify } from '../utils'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { dirname, join } from 'path'
import {
  appendFileSync,
  constants as FS_CONSTANTS,
  existsSync,
  readdirSync,
  rmSync
} from 'graceful-fs'
import i18next from 'i18next'
import {
  callRunner,
  launchCleanup,
  prepareLaunch,
  runWineCommand,
  setupEnvVars,
  setupWrappers
} from '../launcher'
import { access, chmod } from 'fs/promises'
import { addShortcuts, removeShortcuts } from '../shortcuts/shortcuts/shortcuts'
import shlex from 'shlex'
import { showDialogBoxModalAuto } from '../dialog/dialog'
import { createAbortController } from '../utils/aborthandler/aborthandler'
import { sendFrontendMessage } from '../main_window'

export function appLogFileLocation(appName: string) {
  return join(heroicGamesConfigPath, `${appName}-lastPlay.log`)
}

export function getAppInfo(appName: string): GameInfo {
  const store = libraryStore.get('games', []) as GameInfo[]
  return store.filter((app) => app.app_name === appName)[0] || {}
}

export async function getAppSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export function addNewApp({
  app_name,
  title,
  install: { executable, platform },
  art_cover,
  art_square
}: SideloadGame): void {
  const game: SideloadGame = {
    runner: 'sideload',
    app_name,
    title,
    install: {
      executable,
      platform
    },
    folder_name: dirname(executable),
    art_cover,
    is_installed: true,
    art_square,
    canRunOffline: true
  }

  if (isMac && executable.endsWith('.app')) {
    const macAppExecutable = readdirSync(
      join(executable, 'Contents', 'MacOS')
    )[0]
    game.install.executable = join(
      executable,
      'Contents',
      'MacOS',
      macAppExecutable
    )
  }

  const current = libraryStore.get('games', []) as SideloadGame[]

  const gameIndex = current.findIndex((value) => value.app_name === app_name)

  // edit app in case it exists
  if (gameIndex !== -1) {
    current[gameIndex] = { ...current[gameIndex], ...game }
  } else {
    current.push(game)
  }

  libraryStore.set('games', current)
  addAppShortcuts(app_name)
  return
}

export async function addAppShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  return addShortcuts(getAppInfo(appName), fromMenu)
}

export async function removeAppShortcuts(appName: string): Promise<void> {
  return removeShortcuts(getAppInfo(appName))
}

export function isAppAvailable(appName: string): boolean {
  const { install } = getAppInfo(appName)
  if (install && install.executable) {
    return existsSync(install.executable)
  }
  return false
}

export async function launchApp(appName: string): Promise<boolean> {
  const gameInfo = getAppInfo(appName)
  const {
    install: { executable },
    folder_name
  } = gameInfo

  const gameSettings = await getAppSettings(appName)
  const { launcherArgs } = gameSettings

  if (executable) {
    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      rpcClient,
      mangoHudCommand,
      gameModeBin,
      steamRuntime
    } = await prepareLaunch(gameSettings, gameInfo, isNativeApp(appName))

    const wrappers = setupWrappers(
      gameSettings,
      mangoHudCommand,
      gameModeBin,
      steamRuntime?.length ? [...steamRuntime] : undefined
    )

    if (!launchPrepSuccess) {
      appendFileSync(
        appLogFileLocation(appName),
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
    if (isNativeApp(appName)) {
      logInfo(
        `launching native sideloaded: ${executable} ${launcherArgs ?? ''}`,
        { prefix: LogPrefix.Backend }
      )

      try {
        await access(executable, FS_CONSTANTS.X_OK)
      } catch (error) {
        logWarning('File not executable, changing permissions temporarilly', {
          prefix: LogPrefix.Backend
        })
        // On Mac, it gives an error when changing the permissions of the file inside the app bundle. But we need it for other executables like scripts.
        if (isLinux || (isMac && !executable.endsWith('.app'))) {
          await chmod(executable, 0o775)
        }
      }

      const commandParts = shlex.split(launcherArgs ?? '')
      await callRunner(
        commandParts,
        {
          name: 'sideload',
          logPrefix: LogPrefix.Backend,
          bin: executable,
          dir: dirname(executable)
        },
        createAbortController(appName),
        {
          env,
          wrappers,
          logFile: appLogFileLocation(appName),
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

    logInfo(`launching non-native sideloaded: ${executable}}`, {
      prefix: LogPrefix.Backend
    })

    if (isMac) {
      const globalSettings = await GameConfig.get('global').getSettings()
      gameSettings.wineVersion = globalSettings.wineVersion
    }

    await runWineCommand({
      commandParts: [executable, launcherArgs ?? ''],
      gameSettings,
      wait: false,
      startFolder: folder_name,
      options: {
        wrappers,
        logFile: appLogFileLocation(appName),
        logMessagePrefix: LogPrefix.Backend
      }
    })

    launchCleanup(rpcClient)

    return true
  }
  return false
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<string> {
  const {
    install: { install_path },
    title
  } = getAppInfo(appName)

  if (!install_path) {
    return ''
  }

  if (isWindows) {
    newInstallPath += '\\' + install_path.split('\\').at(-1)
  } else {
    newInstallPath += '/' + install_path.split('/').at(-1)
  }

  logInfo(`Moving ${title} to ${newInstallPath}`, {
    prefix: LogPrefix.Backend
  })
  await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
    .then(() => {
      const installedArray =
        (libraryStore.get('installed', []) as Array<InstalledInfo>) || []

      const gameIndex = installedArray.findIndex(
        (value) => value.appName === appName
      )

      installedArray[gameIndex].install_path = newInstallPath
      libraryStore.set('installed', installedArray)
      logInfo(`Finished Moving ${title}`, { prefix: LogPrefix.Backend })
    })
    .catch((error) => logError(`${error}`, { prefix: LogPrefix.Backend }))
  return newInstallPath
}
export async function stop(appName: string): Promise<void> {
  const {
    install: { executable }
  } = getAppInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)
  }
}

type RemoveArgs = {
  appName: string
  shouldRemovePrefix: boolean
}
export async function removeApp({
  appName,
  shouldRemovePrefix
}: RemoveArgs): Promise<void> {
  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: 'sideload',
    status: 'uninstalling'
  })

  const old = libraryStore.get('games', []) as SideloadGame[]
  const current = old.filter((a: SideloadGame) => a.app_name !== appName)
  libraryStore.set('games', current)

  const { title } = getAppInfo(appName)
  const { winePrefix } = await getAppSettings(appName)

  if (shouldRemovePrefix) {
    logInfo(`Removing prefix ${winePrefix}`, { prefix: LogPrefix.Backend })
    if (existsSync(winePrefix)) {
      // remove prefix if exists
      rmSync(winePrefix, { recursive: true })
    }
  }
  notify({ title, body: i18next.t('notify.uninstalled') })

  removeAppShortcuts(appName)

  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: 'sideload',
    status: 'done'
  })

  logInfo('finished uninstalling', { prefix: LogPrefix.Backend })
}

export function isNativeApp(appName: string): boolean {
  const {
    install: { platform }
  } = getAppInfo(appName)
  if (platform) {
    if (isWindows) {
      return true
    }

    if (isMac && platform === 'Mac') {
      return true
    }

    // small hack, but needs to fix the typings
    const plat = platform.toLowerCase()
    if (isLinux && plat === 'linux') {
      return true
    }
  }

  return false
}
