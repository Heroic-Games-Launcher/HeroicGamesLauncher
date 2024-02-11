import JSON5 from 'json5'
import {
  carnivalConfigPath,
  carnivalInstalled,
  carnivalLibrary,
  carnivalLogFile
} from 'backend/constants'
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
  CarnivalGameInfo,
  CarnivalInstallInfo,
  CarnivalInstallMetadataInfo
} from 'common/types/carnival'
import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { installStore, libraryStore } from './electronStores'
import { getFileSize, getCarnivalBin, removeSpecialcharacters } from 'backend/utils'
import { callRunner } from 'backend/launcher'
import { join } from 'path'
import { app } from 'electron'
import { copySync } from 'fs-extra'
import { CarnivalUser } from './user'
import { JSON_SCHEMA, load } from 'js-yaml'
import { getGamesdbData } from '../gog/library'

const installedGames: Map<string, CarnivalInstallMetadataInfo> = new Map()
const library: Map<string, GameInfo> = new Map()

interface libraryYAMLInterface {
  collection: CarnivalGameInfo[]
}

export async function initCarnivalLibraryManager() {
  // Migrate user data from global Carnival config if necessary
  const globalCarnivalConfig = join(app.getPath('appData'), 'carnival')
  if (!existsSync(carnivalConfigPath) && existsSync(globalCarnivalConfig)) {
    copySync(globalCarnivalConfig, carnivalConfigPath)
    await CarnivalUser.getUserData()
  }

  refresh()
}

/**
 * Loads all the user's games into `library`
 */
async function loadGamesInAccount() {
  if (!existsSync(carnivalLibrary)) {
    return
  }
  const libraryYAML = load(
    readFileSync(carnivalLibrary, 'utf-8'),{schema: JSON_SCHEMA}
  ) as libraryYAMLInterface

  const libraryJSON = libraryYAML.collection
  libraryJSON.forEach(async (game) => {

    const info = installedGames.get(game.slugged_name)
    // Create save folder name like carnival
    const meta = await getGamesdbData('indiegala', game.slugged_name, false)

    const developers_list : string[] = []
    if (meta?.data?.game?.developers) {
      meta?.data?.game?.developers.forEach((dev) => {
        developers_list.push(dev.name)
      })
    }

    const safeFolderName = removeSpecialcharacters(game.slugged_name ?? '')
    const install_data = installStore.get(game.slugged_name)
    library.set(game.name, {
      app_name: game.name,
      art_cover: meta?.data?.game?.cover ? meta?.data?.game?.cover.url_format.replace('{formatter}.{ext}','.png') : '',
      art_square: meta?.data?.game?.square_icon ? meta?.data?.game?.square_icon.url_format.replace('{formatter}.{ext}','.png') : '',
      canRunOffline: true, // indieGala only has offline games
      install: info
        ? {
            install_path: info.install_path,
            // For some time size was undefined in installed.json, that's why we
            // need to keep this fallback to 0
            install_size: getFileSize(install_data?.manifest.download_size ?? 0),
            version: info.version,
            platform: 'Windows' // indieGala only supports Windows
          }
        : {},
      folder_name: safeFolderName,
      unique_name: game.slugged_name,
      is_installed: info !== undefined,
      runner: 'carnival',
      title: game.name,
      description: meta?.data?.game?.summary ? meta?.data?.game?.summary['*'] : '',
      developer: developers_list ? developers_list.join(', ') : '',
      is_linux_native: false,
      is_mac_native: false
    })
  })
}

/**
 * Removes a game entry directly from Carnivals' installed.json config file
 *
 * @param appName The id of the app entry to remove
 */
export function removeFromInstalledConfig(appName: string) {
  installedGames.clear()
  if (existsSync(carnivalInstalled)) {
    try {
      logDebug(appName, LogPrefix.Carnival)
 //     const _installed = load(
   //     readFileSync(carnivalInstalled, 'utf-8')
     // )
      // const newInstalled = installed.filter((game) => game.id !== appName)
      // writeFileSync(carnivalInstalled, JSON.stringify(newInstalled), 'utf-8')
    } catch (error) {
      logError(
        ['Corrupted installed.yml file, cannot load installed games', error],
        LogPrefix.Carnival
      )
    }
  }
}

/**
 * Fetches and parses the game's `fuel.json` file
 */
export function fetchFuelJSON(
  appName: string,
  installedPath?: string
): FuelSchema | null {
  const game = getGameInfo(appName)
  const basePath = installedPath ?? game?.install.install_path
  if (!basePath) {
    logError(['Could not find install path for', appName], LogPrefix.Carnival)
    return null
  }

  const fuelJSONPath = join(basePath, 'fuel.json')
  logDebug(['fuel.json path:', fuelJSONPath], LogPrefix.Carnival)

  if (!existsSync(fuelJSONPath)) {
    return null
  }

  try {
    return JSON5.parse(readFileSync(fuelJSONPath, 'utf-8'))
  } catch (error) {
    logError(['Could not read', `${fuelJSONPath}:`, error], LogPrefix.Carnival)
  }

  return null
}

/**
 * Obtain a list of updateable games.
 *
 * @returns App names of updateable games.
 */
export async function listUpdateableGames(): Promise<string[]> {
  if (!CarnivalUser.isLoggedIn()) {
    return []
  }
  logInfo('Looking for updates...', LogPrefix.Carnival)

  const abortID = 'carnival-list-updates'
  const { stdout: output } = await runRunnerCommand(
    ['list-updates', '--json'],
    createAbortController(abortID)
  )
  deleteAbortController(abortID)

  if (!output) {
    /*
     * Nothing installed: nothing to update, output will be empty and JSON.parse can't
     * handle empty strings (they aren't proper JSON).
     */
    return []
  }

  const updates: string[] = JSON.parse(output)
  if (updates.length) {
    logInfo(['Found', `${updates.length}`, 'games to update'], LogPrefix.Carnival)
  }
  return updates
}

/**
 * Refresh games in the user's library
 */
async function refreshCarnival(): Promise<ExecResult> {
  logInfo('Refreshing indieGala Games...', LogPrefix.Carnival)

  const abortID = 'carnival-refresh'
  const res = await runRunnerCommand(
    ['library'],
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (res.error) {
    logError(['Failed to refresh library:', res.error], LogPrefix.Carnival)
  }
  return {
    stderr: '',
    stdout: ''
  }
}

export function getInstallMetadata(
  appName: string
): CarnivalInstallMetadataInfo | undefined {
  if (!existsSync(carnivalInstalled)) {
    return
  }

  try {
    const installed = load(
      readFileSync(carnivalInstalled, 'utf-8')
    ) as object
    const game = getGameFromLibrary(appName)

    return (game && game.unique_name && installed[game.unique_name]) ? installed[game.unique_name] : undefined

  } catch (error) {
    logError(
      ['Corrupted installed.json file, cannot load installed games', error],
      LogPrefix.Carnival
    )
  }
  return
}

/**
 * Refresh `installedGames` from file.
 */
export function refreshInstalled() {
  installedGames.clear()
  if (existsSync(carnivalInstalled)) {
    try {
      const installed = load(
        readFileSync(carnivalInstalled, 'utf-8')
      ) as object

      Object.getOwnPropertyNames(installed).forEach((unique_name) => {
        installedGames.set(unique_name, installed[unique_name] as CarnivalInstallMetadataInfo)
      })
    } catch (error) {
      logError(
        ['Corrupted installed.yml file, cannot load installed games', error],
        LogPrefix.Carnival
      )
    }
  }
}

const defaultExecResult = {
  stderr: '',
  stdout: ''
}

/**
 * Get the game info of all games in the library
 *
 * @returns Array of objects.
 */
export async function refresh(): Promise<ExecResult | null> {
  if (!CarnivalUser.isLoggedIn()) {
    return defaultExecResult
  }
  logInfo('Refreshing library...', LogPrefix.Carnival)

  refreshCarnival()
  refreshInstalled()
  await loadGamesInAccount()

  const arr = Array.from(library.values())
  libraryStore.set('library', arr)
  logInfo(['Game list updated, got', `${arr.length}`, 'games'], LogPrefix.Carnival)

  return defaultExecResult
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

  logInfo(['Loading', appName, 'from metadata files'], LogPrefix.Carnival)
  refreshInstalled()
  loadGamesInAccount()

  const game = library.get(appName)
  if (!game) {
    logError(
      ['Could not find game with id', appName, `in user's library`],
      LogPrefix.Carnival
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
): Promise<CarnivalInstallInfo> {
  const cache = installStore.get(appName)
  if (cache) {
    logDebug('Using cached install info', LogPrefix.Carnival)
    return cache
  }

  logInfo('Getting more details', LogPrefix.Carnival)
  refreshInstalled()

  const game = library.get(appName)
  if (game) {
    const metadata = installedGames.get(appName)
    // Get size info from Carnival
    const { stdout: output } = await runRunnerCommand(
      ['install','--info', game.unique_name ? game.unique_name : appName],
      createAbortController(appName)
    )
    deleteAbortController(appName)
    
    const ds_regex = /Download Size: ([0-9]+\.*[0-9]*) ([MKGT])B/
    const human_to_factor = {K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024, T: 1024 * 1024 * 1024 * 1024}
    const download_size = ds_regex.test(output) ? (ds_regex!.exec(output)![1] as unknown as number) * human_to_factor[ds_regex!.exec(output)![2]] : 0
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
        download_size,
        disk_size: download_size
      }
    }
    installStore.set(appName, installInfo)
    return installInfo
  }

  logError(['Could not find game with id', appName], LogPrefix.Carnival)
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
      LogPrefix.Carnival
    )
  }

  updateInstalledPathInJSON(appName, newAppPath)
}

function updateInstalledPathInJSON(appName: string, newAppPath: string) {
  // Make sure we get the latest installed info
  refreshInstalled()

  const installedGameInfo = installedGames.get(appName)
  if (installedGameInfo) installedGameInfo.install_path = newAppPath
  else {
    logWarning(
      `installed game info not found in changeGameInstallPath for ${appName}`,
      LogPrefix.Carnival
    )
  }

  if (!existsSync(carnivalInstalled)) {
    logError(
      ['Could not find installed.json in', carnivalInstalled],
      LogPrefix.Carnival
    )
    return
  }

  writeFileSync(
    carnivalInstalled,
    JSON.stringify(Array.from(installedGames.values())),
    'utf-8'
  )
  logInfo(
    ['Updated install path for', appName, 'in', carnivalInstalled],
    LogPrefix.Carnival
  )
}

/**
 * Change the install state of a game without a complete library reload.
 *
 * @param appName
 * @param state true if its installed, false otherwise.
 */
export function installState(appName: string, state: boolean) {
  if (!state) {
    installedGames.delete(appName)
    installStore.delete(appName)
    return
  }

  const metadata = getInstallMetadata(appName)
  if (!metadata) {
    logError(['Could not find install metadata for', appName], LogPrefix.Carnival)
    return
  }
  installedGames.set(appName, metadata)
}

export async function runRunnerCommand(
  commandParts: (string | undefined)[],
  abortController: AbortController,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const { dir, bin } = getCarnivalBin()

  // Set CARNIVAL_CONFIG_PATH to a custom, Heroic-specific location so user-made
  // changes to Carnival's main config file don't affect us
  if (!options) {
    options = {}
  }
  if (!options.env) {
    options.env = {}
  }
  options.env.CARNIVAL_CONFIG_PATH = carnivalConfigPath
  const cleanCommandParts: string[] = []
  for (const part in commandParts) {
    if (part) {
      cleanCommandParts.push(part)
    }
  }

  return callRunner(
    cleanCommandParts,
    { name: 'carnival', logPrefix: LogPrefix.Carnival, bin, dir },
    {
      ...options,
      verboseLogFile: carnivalLogFile
    }
  )
}

export function getGameFromLibrary(gameName: string) : GameInfo | undefined {
  for (const game of libraryStore.get('library', [])) {
    if (game.app_name === gameName)
      return game
  }
  return undefined
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function changeVersionPinnedStatus(appName: string, status: boolean) {
  logWarning(
    'changeVersionPinnedStatus not implemented on Carnival Library Manager'
  )
}

export const getLaunchOptions = () => []
