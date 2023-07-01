import { nileInstalled, nileLibrary, nileLogFile } from 'backend/constants'
import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logWarning
} from 'backend/logger/logger'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import { CallRunnerOptions, ExecResult, GameInfo } from 'common/types'
import {
  FuelSchema,
  NileGameInfo,
  NileInstallInfo,
  NileInstallMetadataInfo
} from 'common/types/nile'
import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { installStore, libraryStore } from './electronStores'
import { getNileBin } from 'backend/utils'
import { callRunner } from 'backend/launcher'
import { join } from 'path'

const installedGames: Map<string, NileInstallMetadataInfo> = new Map()
const library: Map<string, GameInfo> = new Map()

/**
 * Loads all the user's games into `library`
 */
function loadGamesInAccount() {
  if (!existsSync(nileLibrary)) {
    return
  }
  const libraryJSON: NileGameInfo[] = JSON.parse(
    readFileSync(nileLibrary, 'utf-8')
  )
  libraryJSON.forEach((game) => {
    const { product } = game
    const { title, productDetail } = product
    const {
      details: { shortDescription, developer },
      iconUrl
    } = productDetail

    const info = installedGames.get(game.id)

    library.set(game.id, {
      app_name: game.id,
      art_cover: iconUrl,
      art_square: iconUrl,
      canRunOffline: true, // Amazon Games only has offline games
      install: info
        ? {
            install_path: info.path,
            version: info.version,
            platform: 'Windows' // Amazon Games only supports Windows
          }
        : {},
      is_installed: info !== undefined,
      runner: 'nile',
      title,
      description: shortDescription,
      developer,
      is_linux_native: false,
      is_mac_native: false
    })
  })
}

/**
 * Removes a game entry directly from Niles' installed.json config file
 *
 * @param appName The id of the app entry to remove
 */
export function removeFromInstalledConfig(appName: string) {
  installedGames.clear()
  if (existsSync(nileInstalled)) {
    try {
      const installed: NileInstallMetadataInfo[] = JSON.parse(
        readFileSync(nileInstalled, 'utf-8')
      )
      const newInstalled = installed.filter((game) => game.id !== appName)
      writeFileSync(nileInstalled, JSON.stringify(newInstalled), 'utf-8')
    } catch (error) {
      logError(
        ['Corrupted installed.json file, cannot load installed games', error],
        LogPrefix.Nile
      )
    }
  }
}

/**
 * Fetches and parses the game's `fuel.json` file
 */
export function fetchFuelJSON(appName: string): FuelSchema | null {
  const game = getGameInfo(appName)
  if (!game?.install.install_path) {
    logError(['Could not find install path for', appName], LogPrefix.Nile)
    return null
  }

  const { install_path } = game.install
  const fuelJSONPath = join(install_path, 'fuel.json')

  if (!existsSync(fuelJSONPath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(fuelJSONPath, 'utf-8'))
  } catch (error) {
    logError(['Could not read', `${fuelJSONPath}:`, error], LogPrefix.Nile)
  }

  return null
}

/**
 * Obtain a list of updateable games.
 *
 * @returns App names of updateable games.
 */
export async function listUpdateableGames(): Promise<string[]> {
  // TODO: Fill in logic
  return []
}

/**
 * Refresh games in the user's library
 */
async function refreshNile(): Promise<ExecResult> {
  logInfo('Refreshing Amazon Games...', LogPrefix.Nile)

  const abortID = 'nile-refresh'
  const res = await runRunnerCommand(
    ['library', 'sync'],
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (res.error) {
    logError(['Failed to refresh library:', res.error], LogPrefix.Nile)
  }
  return {
    stderr: '',
    stdout: ''
  }
}

/**
 * Refresh `installedGames` from file.
 */
export function refreshInstalled() {
  installedGames.clear()
  if (existsSync(nileInstalled)) {
    try {
      const installed: NileInstallMetadataInfo[] = JSON.parse(
        readFileSync(nileInstalled, 'utf-8')
      )
      installed.forEach((metadata) => {
        installedGames.set(metadata.id, metadata)
      })
    } catch (error) {
      logError(
        ['Corrupted installed.json file, cannot load installed games', error],
        LogPrefix.Nile
      )
    }
  }
}

/**
 * Get the game info of all games in the library
 *
 * @returns Array of objects.
 */
export async function refresh(): Promise<ExecResult | null> {
  logInfo('Refreshing library...', LogPrefix.Nile)

  refreshNile()
  refreshInstalled()
  loadGamesInAccount()

  const arr = Array.from(library.values())
  libraryStore.set('library', arr)
  logInfo(['Game list updated, got', `${arr.length}`, 'games'], LogPrefix.Nile)

  return {
    stderr: '',
    stdout: ''
  }
}

/**
 * Get game info for a particular game.
 *
 * @param appName The AppName of the game you want the info of
 * @param forceReload Discards game info in `library` and always reads info from metadata files
 * @returns GameInfo
 */
export function getGameInfo(
  appName: string,
  forceReload = false
): GameInfo | undefined {
  if (!forceReload) {
    const gameInMemory = library.get(appName)
    if (gameInMemory) {
      return gameInMemory
    }
  }

  logInfo(['Loading', appName, 'from metadata files'], LogPrefix.Nile)
  refreshInstalled()
  loadGamesInAccount()

  const game = library.get(appName)
  if (!game) {
    logError(
      ['Could not find game with id', appName, `in user's library`],
      LogPrefix.Nile
    )
    return
  }
  return game
}

/**
 * Get game info for a particular game.
 */
export async function getInstallInfo(
  appName: string
): Promise<NileInstallInfo> {
  const cache = installStore.get(appName)
  if (cache) {
    logDebug('Using cached install info', LogPrefix.Nile)
    return cache
  }

  logInfo('Getting more details', LogPrefix.Nile)
  refreshInstalled()

  const game = library.get(appName)
  if (game) {
    const metadata = installedGames.get(appName)
    const installInfo = {
      game: {
        id: appName,
        path: '',
        version: '',
        launch_options: [],
        owned_dlc: [],
        app_name: game.app_name,
        cloud_saves_supported: false,
        external_activation: '',
        is_dlc: false,
        platform_versions: {
          Windows: metadata?.version ?? ''
        },
        title: game.title,
        ...metadata
      },
      manifest: {
        download_size: 1000, // FIXME: Proper size
        disk_size: 1000 // FIXME: Proper size
        // TODO: Fill out later
      }
    }
    installStore.set(appName, installInfo)
    return installInfo
  }

  logError(['Could not find game with id', appName], LogPrefix.Nile)
  return {
    game: {
      app_name: '',
      cloud_saves_supported: false,
      external_activation: '',
      id: '',
      is_dlc: false,
      launch_options: [],
      owned_dlc: [],
      path: '',
      platform_versions: {
        Windows: ''
      },
      title: '',
      version: ''
    },
    manifest: {
      disk_size: 0,
      download_size: 0
    }
  }
}

/**
 * Change the install path for a given game.
 *
 * @param appName
 * @param newPath
 */
export async function changeGameInstallPath(
  appName: string,
  newAppPath: string
) {
  const libraryGameInfo = library.get(appName)
  if (libraryGameInfo) libraryGameInfo.install.install_path = newAppPath
  else {
    logWarning(
      `library game info not found in changeGameInstallPath for ${appName}`,
      LogPrefix.Nile
    )
  }

  updateInstalledPathInJSON(appName, newAppPath)
}

function updateInstalledPathInJSON(appName: string, newAppPath: string) {
  // Make sure we get the latest installed info
  refreshInstalled()

  const installedGameInfo = installedGames.get(appName)
  if (installedGameInfo) installedGameInfo.path = newAppPath
  else {
    logWarning(
      `installed game info not found in changeGameInstallPath for ${appName}`,
      LogPrefix.Nile
    )
  }

  if (!existsSync(nileInstalled)) {
    logError(
      ['Could not find installed.json in', nileInstalled],
      LogPrefix.Nile
    )
    return
  }

  writeFileSync(
    nileInstalled,
    JSON.stringify(Array.from(installedGames.values())),
    'utf-8'
  )
  logInfo(
    ['Updated install path for', appName, 'in', nileInstalled],
    LogPrefix.Nile
  )
}

/**
 * Change the install state of a game without a complete library reload.
 *
 * @param appName
 * @param state true if its installed, false otherwise.
 */
export function installState() {
  // It's easier to just reload installed from config
  refreshInstalled()
}

export async function runRunnerCommand(
  commandParts: string[],
  abortController: AbortController,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const { dir, bin } = getNileBin()

  // TODO: Set XDG_CONFIG_HOME to a separate location
  return callRunner(
    commandParts,
    { name: 'nile', logPrefix: LogPrefix.Nile, bin, dir },
    abortController,
    {
      ...options,
      verboseLogFile: nileLogFile
    }
  )
}
