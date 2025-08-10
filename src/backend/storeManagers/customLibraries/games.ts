import {
  ExecResult,
  ExtraInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
  LaunchOption,
  CustomLibraryGameInfo
} from 'common/types'
import { GameConfig } from '../../game_config'
import { killPattern, shutdownWine } from '../../utils'
import { existsSync } from 'graceful-fs'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { GOGCloudSavesLocation } from 'common/types/gog'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import type LogWriter from 'backend/logger/log_writer'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { logWarning } from 'backend/logger'

export function getGameInfo(appName: string): CustomLibraryGameInfo {
  logWarning(
    `getGameInfo not implemented on custom library game manager. called for appName = ${appName}`
  )
  return {
    runner: 'customLibrary',
    app_name: appName,
  }
}

export async function getSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

export async function removeShortcuts(appName: string): Promise<void> {
  return removeShortcutsUtil(getGameInfo(appName))
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const gameInfo = getGameInfo(appName)
    if (gameInfo && gameInfo.is_installed) {
      if (
        gameInfo.install.install_path &&
        existsSync(gameInfo.install.install_path)
      ) {
        resolve(true)
      } else {
        resolve(false)
      }
    }
    resolve(false)
  })
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args: string[] = []
): Promise<boolean> {
  logWarning(
    `launch not implemented on custom library game manager. called for appName = ${appName}`
  )
  return false
}

export async function stop(appName: string): Promise<void> {
  const {
    install: { executable = undefined }
  } = getGameInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)

    if (!isNative(appName)) {
      const gameSettings = await getSettings(appName)
      shutdownWine(gameSettings)
    }
  }
}

export async function uninstall({
  appName,
  shouldRemovePrefix
}: RemoveArgs): Promise<ExecResult> {
  logWarning(
    `uninstall not implemented on custom library game manager. called for appName = ${appName}`
  )
  return { stderr: '', stdout: '' }
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const game = getGameInfo(appName)
  return (
    game.extra || {
      about: {
        description: '',
        shortDescription: ''
      },
      reqs: [],
      storeUrl: ''
    }
  )
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
) {
  logWarning(
    `onInstallOrUpdateOutput not implemented on Custom Game Manager. called for appName = ${appName}`
  )
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  logWarning(
    `moveInstall not implemented on Custom Game Manager. called for appName = ${appName}`
  )
  return { status: 'error' }
}

export async function repair(appName: string): Promise<ExecResult> {
  logWarning(
    `repair not implemented on Custom Game Manager. called for appName = ${appName}`
  )
  return { stderr: '', stdout: '' }
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[]
): Promise<string> {
  logWarning(
    `syncSaves not implemented on Custom Game Manager. called for appName = ${appName}`
  )
  return ''
}

export async function forceUninstall(appName: string): Promise<void> {
  logWarning(
    `forceUninstall not implemented on custom library game manager. called for appName = ${appName}`
  )
}

// Simple install function that works with the download manager
export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  logWarning(
    `install not implemented on custom library game manager. called for appName = ${appName}`
  )
  return { status: 'error' }
}

export function isNative(appName: string): boolean {
  const gameInfo = getGameInfo(appName)
  if (isWindows) {
    return true
  }

  if (isMac && gameInfo.install.platform === 'osx') {
    return true
  }

  if (isLinux && gameInfo.install.platform === 'linux') {
    return true
  }

  return false
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  logWarning(
    `importGame not implemented on custom library game manager. called for appName = ${appName}`
  )
  return { stderr: '', stdout: '' }
}

export async function update(
  appName: string
): Promise<{ status: 'done' | 'error' }> {
  return { status: 'error' }
}
