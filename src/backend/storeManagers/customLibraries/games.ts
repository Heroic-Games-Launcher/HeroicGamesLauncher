import {
  ExecResult,
  ExtraInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
  LaunchOption,
  InstalledInfo,
  CustomLibraryGameInfo
} from 'common/types'
import { libraryStore, installedGamesStore } from './electronStores'
import { GameConfig } from '../../game_config'
import { killPattern, shutdownWine, getFileSize } from '../../utils'
import { sendFrontendMessage } from '../../ipc'
import { logInfo, LogPrefix, logWarning, logError } from 'backend/logger'
import { join } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import { mkdir } from 'fs/promises'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { launchGame } from 'backend/storeManagers/storeManagerCommon/games'
import { GOGCloudSavesLocation } from 'common/types/gog'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import type LogWriter from 'backend/logger/log_writer'
import {
  refreshInstalled,
  importGame as importCustomLibraryGame,
  getGameInfo as getCustomLibraryGameInfo
} from './library'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { executeTasks } from './taskExecutor'

export function getGameInfo(appName: string): CustomLibraryGameInfo {
  return getCustomLibraryGameInfo(appName)
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
  // launchGame expects an absolute path to the executable. This is a hack to include the absolute path to the executable.
  const gameInfo = getGameInfo(appName)
  if (!gameInfo.install.install_path) {
    throw new Error(`No install path found for game ${appName}`)
  }
  if (!gameInfo.install.executable) {
    throw new Error(`No executable found for game ${appName}`)
  }

  let currentExecutable = join(
    gameInfo.install.install_path,
    gameInfo.install.executable
  )
  const finalArgs = [...args]
  if (launchArguments) {
    if (launchArguments.type === 'basic') {
      // Add parameters from basic launch option
      if (launchArguments.parameters) {
        finalArgs.push(
          ...launchArguments.parameters.split(' ').filter((arg) => arg.trim())
        )
      }
    } else if (launchArguments.type === 'altExe') {
      // Override executable for alternative executable
      if (launchArguments.executable && gameInfo.install.install_path) {
        currentExecutable = join(
          gameInfo.install.install_path,
          launchArguments.executable
        )
      }
    }
  }

  gameInfo.install.executable = currentExecutable

  return launchGame(appName, logWriter, gameInfo, 'customLibrary', finalArgs)
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

export async function uninstall({ appName }: RemoveArgs): Promise<ExecResult> {
  const array = installedGamesStore.get('installed', [])
  const index = array.findIndex((game) => game.appName === appName)

  if (index === -1) {
    throw Error("Game isn't installed")
  }

  const [object] = array.splice(index, 1)

  try {
    const gameInfo = getGameInfo(appName)

    logInfo(`Executing uninstall tasks for ${appName}`, LogPrefix.CustomLibrary)
    await executeTasks(
      appName,
      gameInfo.uninstallTasks,
      object.install_path || '',
      'uninstall'
    )

    if (existsSync(object.install_path)) {
      logInfo(
        `Removing install directory: ${object.install_path}`,
        LogPrefix.CustomLibrary
      )
      rmSync(object.install_path, { recursive: true })
    }
  } catch (error) {
    logError(
      `Failed to execute uninstall tasks: ${error}`,
      LogPrefix.CustomLibrary
    )
  }

  installedGamesStore.set('installed', array)
  refreshInstalled()
  const gameInfo = getGameInfo(appName)
  gameInfo.is_installed = false
  gameInfo.install = { is_dlc: false }
  await removeShortcutsUtil(gameInfo)
  await removeNonSteamGame({ gameInfo })
  sendFrontendMessage('pushGameToLibrary', gameInfo)

  return { stdout: '', stderr: '' }
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
  const installed = installedGamesStore.get('installed', [])
  const newInstalled = installed.filter((g) => g.appName !== appName)
  installedGamesStore.set('installed', newInstalled)
  refreshInstalled()
  sendFrontendMessage('pushGameToLibrary', getGameInfo(appName))
}

// Updated install function that works with the task system and download manager
export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  try {
    logInfo(`Installing custom game ${appName}`, LogPrefix.CustomLibrary)

    const gameInfo = getGameInfo(appName)
    if (!gameInfo) {
      const error = `Game ${appName} not found in custom library`
      logError(error, LogPrefix.CustomLibrary)
      return { status: 'error', error: 'Game not found' }
    }

    // Check if already installed
    if (
      gameInfo.is_installed &&
      gameInfo.install.install_path &&
      gameInfo.install.executable
    ) {
      const executablePath = join(
        gameInfo.install.install_path,
        gameInfo.install.executable
      )
      if (existsSync(executablePath)) {
        logInfo(
          `Game already installed for ${appName}`,
          LogPrefix.CustomLibrary
        )
        return { status: 'done' }
      }
    }

    // Create install directory
    await mkdir(args.path, { recursive: true })
    const gameFolder = join(args.path, appName)
    await mkdir(gameFolder, { recursive: true })

    // Execute install tasks using the task system
    await executeTasks(appName, gameInfo.installTasks, gameFolder, 'install')

    // Determine platform and executable from tasks or game info
    const executable = gameInfo.install.executable || ''
    let platform: InstallPlatform = 'linux'

    if (executable.toLowerCase().endsWith('.exe')) {
      platform = 'windows'
    }

    // Save installation info to persistent store
    const installedData: InstalledInfo = {
      platform,
      executable,
      install_path: gameFolder,
      install_size: gameInfo.installSizeBytes
        ? getFileSize(gameInfo.installSizeBytes)
        : 'Unknown',
      is_dlc: false,
      version: gameInfo.install.version || '1.0',
      appName: appName
    }

    const installedArray = installedGamesStore.get('installed', [])

    // Remove existing entry if it exists
    const filteredArray = installedArray.filter(
      (item) => item.appName !== appName
    )
    filteredArray.push(installedData)
    installedGamesStore.set('installed', filteredArray)

    // Update in-memory map and game library
    refreshInstalled()

    // Update game as installed in the library
    const games = libraryStore.get('games', [])
    const gameIndex = games.findIndex((game) => game.app_name === appName)
    if (gameIndex !== -1) {
      games[gameIndex].is_installed = true
      games[gameIndex].install = installedData
      libraryStore.set('games', games)
    }

    // Add shortcuts
    try {
      const updatedGameInfo = getGameInfo(appName)
      if (updatedGameInfo) {
        addShortcutsUtil(updatedGameInfo)
        logInfo(`Added shortcuts for ${appName}`, LogPrefix.CustomLibrary)
      }
    } catch (error) {
      logWarning(`Could not add shortcuts: ${error}`, LogPrefix.CustomLibrary)
    }

    logInfo(
      `Successfully installed custom game ${appName}`,
      LogPrefix.CustomLibrary
    )
    return { status: 'done' }
  } catch (error) {
    logError(`Install failed for ${appName}: ${error}`, LogPrefix.CustomLibrary)
    return { status: 'error', error: String(error) }
  }
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
  const gameInfo = getGameInfo(appName)

  if (!gameInfo?.app_name) {
    const error = `Game ${appName} not found in custom library`
    logError(error, LogPrefix.CustomLibrary)
    return { stderr: error, stdout: '', error }
  }

  try {
    await importCustomLibraryGame(gameInfo, path, platform)
    addShortcutsUtil(gameInfo)
  } catch (error) {
    const errorMsg = `Failed to import ${appName}: ${error instanceof Error ? error.message : error}`
    logError(errorMsg, LogPrefix.CustomLibrary)
    return { stderr: errorMsg, stdout: '', error: errorMsg }
  }

  return { stderr: '', stdout: `Successfully imported ${appName}` }
}

export async function update(
  appName: string
): Promise<{ status: 'done' | 'error' }> {
  return { status: 'error' }
}
