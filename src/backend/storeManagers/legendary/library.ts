import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { existsSync, readFileSync, readdirSync } from 'graceful-fs'

import {
  GameInfo,
  InstalledInfo,
  CallRunnerOptions,
  ExecResult,
  InstallPlatform
} from 'common/types'
import {
  InstalledJsonMetadata,
  GameMetadata,
  LegendaryInstallInfo
} from 'common/types/legendary'
import { LegendaryUser } from './user'
import {
  formatEpicStoreUrl,
  getLegendaryBin,
  isEpicServiceOffline,
  getFileSize
} from '../../utils'
import {
  fallBackImage,
  legendaryConfigPath,
  legendaryLogFile,
  legendaryMetadata
} from '../../constants'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from '../../logger/logger'
import { installStore, libraryStore } from './electronStores'
import { callRunner } from '../../launcher'
import { dirname, join } from 'path'
import { isOnline } from '../../online_monitor'
import { update } from './games'

const allGames: Set<string> = new Set()
let installedGames: Map<string, InstalledJsonMetadata> = new Map()
const library: Map<string, GameInfo> = new Map()

export async function initLegendaryLibraryManager() {
  loadGamesInAccount()
  await refresh()
}

/**
 * Loads all of the user's games into `allGames`
 */
export function loadGamesInAccount() {
  if (!existsSync(legendaryMetadata)) {
    return
  }
  readdirSync(legendaryMetadata).forEach((filename) => {
    // This shouldn't ever happen, but just in case
    if (!filename.endsWith('.json')) {
      return
    }
    const appName = filename.split('.').slice(0, -1).join('.')
    allGames.add(appName)
  })
}

/**
 * Refresh games in the user's library.
 */
async function refreshLegendary(): Promise<ExecResult> {
  logInfo('Refreshing Epic Games...', LogPrefix.Legendary)
  const epicOffline = await isEpicServiceOffline()
  if (epicOffline) {
    logWarning(
      'Epic is Offline right now, cannot update game list!',
      LogPrefix.Backend
    )
    return { stderr: 'Epic offline, unable to update game list', stdout: '' }
  }

  const abortID = 'legendary-refresh'
  const res = await runRunnerCommand(
    ['list', '--third-party'],
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (res.error) {
    logError(['Failed to refresh library:', res.error], LogPrefix.Legendary)
  }
  refreshInstalled()
  return res
}

/**
 * Refresh `installedGames` from file.
 */
export function refreshInstalled() {
  const installedJSON = join(legendaryConfigPath, 'installed.json')
  if (existsSync(installedJSON)) {
    try {
      installedGames = new Map(
        Object.entries(JSON.parse(readFileSync(installedJSON, 'utf-8')))
      )
    } catch (error) {
      // disabling log here because its giving false positives on import command
      logError(
        ['Corrupted installed.json file, cannot load installed games', error],
        LogPrefix.Legendary
      )
      installedGames = new Map()
    }
  } else {
    installedGames = new Map()
  }
}

/**
 * Get the game info of all games in the library
 *
 * @param fullRefresh Reload from Legendary.
 * @returns Array of objects.
 */
export async function refresh(): Promise<ExecResult | null> {
  logInfo('Refreshing library...', LogPrefix.Legendary)
  const isLoggedIn = LegendaryUser.isLoggedIn()
  if (!isLoggedIn) {
    return {
      stderr: 'You must be logged into Epic Games to refresh this library!',
      stdout: ''
    }
  }

  refreshLegendary()
  loadGamesInAccount()
  refreshInstalled()

  try {
    await loadAll()
  } catch (error) {
    logError(error, LogPrefix.Legendary)
  }
  const arr = Array.from(library.values())
  libraryStore.set('library', arr)
  logInfo(
    ['Game list updated, got', `${arr.length}`, 'games & DLCs'],
    LogPrefix.Legendary
  )
  return {
    stderr: '',
    stdout: ''
  }
}

export function getListOfGames() {
  return libraryStore.get('library', [])
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
  if (!hasGame(appName)) {
    logWarning(
      ['Requested game', appName, 'was not found in library'],
      LogPrefix.Legendary
    )
    return undefined
  }
  // We have the game, but info wasn't loaded yet
  if (!library.has(appName) || forceReload) {
    loadFile(appName + '.json')
  }
  return library.get(appName)
}

/**
 * Get game info for a particular game.
 */
export async function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform
): Promise<LegendaryInstallInfo> {
  const cache = installStore.get_nodefault(appName)
  if (cache) {
    logDebug('Using cached install info', LogPrefix.Legendary)
    return cache
  }

  logInfo(`Getting more details with 'legendary info'`, LogPrefix.Legendary)
  const res = await runRunnerCommand(
    [
      'info',
      appName,
      ...(installPlatform ? ['--platform', installPlatform] : []),
      '--json',
      (await isEpicServiceOffline()) ? '--offline' : ''
    ],
    createAbortController(appName)
  )

  deleteAbortController(appName)

  if (res.error) {
    logError(['Failed to get more details:', res.error], LogPrefix.Legendary)
  }
  try {
    const info: LegendaryInstallInfo = JSON.parse(res.stdout)
    installStore.set(appName, info)
    return info
  } catch (error) {
    throw Error(`Failed to parse install info for ${appName} with: ${error}`)
  }
}

/**
 * Obtain a list of updateable games.
 *
 * @returns App names of updateable games.
 */
export async function listUpdateableGames(): Promise<string[]> {
  const isLoggedIn = LegendaryUser.isLoggedIn()

  if (!isLoggedIn || !isOnline()) {
    return []
  }
  const epicOffline = await isEpicServiceOffline()
  if (epicOffline) {
    logWarning(
      'Epic servers are offline, cannot check for game updates',
      LogPrefix.Backend
    )
    return []
  }

  const abortID = 'legendary-check-updates'
  const res = await runRunnerCommand(
    ['list', '--third-party'],
    createAbortController(abortID),
    {
      logMessagePrefix: 'Checking for game updates'
    }
  )

  deleteAbortController(abortID)

  if (res.abort) {
    return []
  }

  if (res.error) {
    logError(
      ['Failed to check for game updates:', res.error],
      LogPrefix.Legendary
    )
    return []
  }

  // Once we ran `legendary list`, `assets.json` will be updated with the newest
  // game versions, and `installed.json` has our currently installed ones
  const installedJsonFile = join(legendaryConfigPath, 'installed.json')
  let installedJson: Record<string, InstalledJsonMetadata> = {}
  try {
    installedJson = JSON.parse(
      readFileSync(installedJsonFile, { encoding: 'utf-8' })
    )
  } catch (error) {
    logWarning(
      ['Failed to parse games from', installedJsonFile, 'with:', error],
      LogPrefix.Legendary
    )
  }

  // First go through all our installed games and store their versions...
  const installedGames: Map<string, { version: string; platform: string }> =
    new Map()
  for (const [appName, data] of Object.entries(installedJson)) {
    installedGames.set(appName, {
      version: data.version,
      platform: data.platform
    })
  }
  // ...and now go through all games in `assets.json` to get the newest version
  // HACK: Same as above,                         ↓ this isn't always `string`, but it works for now
  const assetsJsonFile = join(legendaryConfigPath, 'assets.json')
  let assetsJson: Record<string, Record<string, string>[]> = {}
  try {
    assetsJson = JSON.parse(readFileSync(assetsJsonFile, { encoding: 'utf-8' }))
  } catch (error) {
    logWarning(
      ['Failed to parse games from', assetsJsonFile, 'with:', error],
      LogPrefix.Legendary
    )
  }

  const updateableGames: string[] = []
  for (const [platform, assets] of Object.entries(assetsJson)) {
    installedGames.forEach(
      ({ version: currentVersion, platform: installedPlatform }, appName) => {
        if (installedPlatform === platform) {
          const currentAsset = assets.find((asset) => {
            return asset.app_name === appName
          })
          if (!currentAsset) {
            logWarning(
              [
                'Game with AppName',
                appName,
                'is installed but was not found on account'
              ],
              LogPrefix.Legendary
            )
            return
          }
          const latestVersion = currentAsset.build_version
          if (currentVersion !== latestVersion) {
            logDebug(
              [
                'Update is available for',
                `${appName}:`,
                currentVersion,
                '!=',
                latestVersion
              ],
              LogPrefix.Legendary
            )
            updateableGames.push(appName)
          }
        }
      }
    )
  }
  logInfo(
    [
      'Found',
      `${updateableGames.length}`,
      'game' + (updateableGames.length !== 1 ? 's' : ''),
      'to update'
    ],
    LogPrefix.Legendary
  )
  return updateableGames
}

/**
 * Update all updateable games.
 * Uses `listUpdateableGames` along with `LegendaryGame.update`
 *
 * @returns Array of results of `Game.update`.
 */
export async function updateAllGames() {
  return (
    await Promise.allSettled(
      (await listUpdateableGames()).map(async (appName) => update(appName))
    )
  ).map((res) => {
    if (res.status === 'fulfilled') {
      return res.value
    } else {
      return null
    }
  })
}

/**
 * Change the install path for a given game.
 *
 * DOES NOT MOVE FILES. Use `LegendaryGame.moveInstall` instead.
 *
 * @param appName
 * @param newPath
 */
export async function changeGameInstallPath(appName: string, newPath: string) {
  const libraryGameInfo = library.get(appName)
  if (libraryGameInfo) libraryGameInfo.install.install_path = newPath
  else {
    logWarning(
      `library game info not found in changeGameInstallPath for ${appName}`,
      LogPrefix.Legendary
    )
  }

  const installedGameInfo = installedGames.get(appName)
  if (installedGameInfo) installedGameInfo.install_path = newPath
  else {
    logWarning(
      `installed game info not found in changeGameInstallPath for ${appName}`,
      LogPrefix.Legendary
    )
  }

  const { error } = await runRunnerCommand(
    ['move', appName, dirname(newPath), '--skip-move'],
    createAbortController(appName)
  )

  deleteAbortController(appName)

  if (error) {
    logError(
      ['Failed to set install path for', `${appName}:`, error],
      LogPrefix.Legendary
    )
  }
}

/**
 * Change the install state of a game without a complete library reload.
 *
 * @param appName
 * @param state true if its installed, false otherwise.
 */
export function installState(appName: string, state: boolean) {
  if (state) {
    // This assumes that fileName and appName are same.
    // If that changes, this will break.
    loadFile(`${appName}.json`)
  } else {
    // @ts-expect-error TODO: Make sure game info is loaded & appName is valid here
    library.get(appName).is_installed = false
    // @ts-expect-error Same as above
    library.get(appName).install = {} as InstalledInfo
    installedGames.delete(appName)
  }
}

/**
 * Load the file completely into our in-memory library.
 * Largely derived from legacy code.
 *
 * @returns True/False, whether or not the file was loaded
 */
function loadFile(fileName: string): boolean {
  const fullPath = join(legendaryMetadata, fileName)

  let app_name: string
  let metadata
  try {
    const data: GameMetadata = JSON.parse(readFileSync(fullPath, 'utf-8'))
    app_name = data.app_name
    metadata = data.metadata
  } catch (error) {
    logError(['Failed to parse', fileName], LogPrefix.Legendary)
    return false
  }
  const { namespace } = metadata

  if (namespace === 'ue') {
    return false
  }

  const {
    description,
    shortDescription = '',
    keyImages = [],
    title,
    developer,
    dlcItemList,
    releaseInfo,
    customAttributes,
    categories
  } = metadata

  // skip mods from the library
  if (categories.some(({ path }) => path === 'mods')) {
    return false
  }

  if (!customAttributes) {
    logWarning(
      ['Incomplete metadata for', fileName, app_name],
      LogPrefix.Legendary
    )
  }

  const dlcs: string[] = []
  const FolderName = customAttributes?.FolderName
  const canRunOffline = customAttributes?.CanRunOffline?.value === 'true'
  const thirdPartyManagedApp =
    customAttributes?.ThirdPartyManagedApp?.value || undefined

  if (dlcItemList) {
    dlcItemList.forEach((v: { releaseInfo: { appId: string }[] }) => {
      if (v.releaseInfo && v.releaseInfo[0]) {
        dlcs.push(v.releaseInfo[0].appId)
      }
    })
  }

  const info = installedGames.get(app_name)
  const {
    executable,
    version,
    install_size,
    install_path,
    platform,
    save_path
  } = info ?? {}

  const saveFolder =
    (platform === 'Mac'
      ? customAttributes?.CloudSaveFolder_MAC?.value
      : customAttributes?.CloudSaveFolder?.value) ?? ''
  const installFolder = FolderName ? FolderName.value : app_name

  const gameBox = keyImages.find(({ type }) => type === 'DieselGameBox')

  const gameBoxTall = keyImages.find(({ type }) => type === 'DieselGameBoxTall')

  const gameBoxStore = keyImages.find(
    ({ type }) => type === 'DieselStoreFrontTall'
  )

  const logo = keyImages.find(({ type }) => type === 'DieselGameBoxLogo')

  const art_cover = gameBox ? gameBox.url : undefined
  const art_logo = logo ? logo.url : undefined
  const art_square = gameBoxTall ? gameBoxTall.url : undefined
  const art_square_front = gameBoxStore ? gameBoxStore.url : undefined

  const is_dlc = Boolean(metadata.mainGameItem)

  const convertedSize = install_size ? getFileSize(Number(install_size)) : '0'

  library.set(app_name, {
    app_name,
    art_cover: art_cover || art_square || fallBackImage,
    art_logo,
    art_square: art_square || art_square_front || art_cover || fallBackImage,
    cloud_save_enabled: Boolean(saveFolder),
    developer,
    extra: {
      about: {
        description,
        shortDescription
      },
      reqs: [],
      storeUrl: formatEpicStoreUrl(title)
    },
    folder_name: installFolder,
    install: {
      executable,
      install_path,
      install_size: convertedSize,
      is_dlc,
      version,
      platform
    },
    is_installed: info !== undefined,
    namespace,
    is_mac_native: info
      ? platform === 'Mac'
      : releaseInfo[0].platform.includes('Mac'),
    save_folder: saveFolder,
    save_path,
    title,
    canRunOffline,
    thirdPartyManagedApp,
    is_linux_native: false,
    runner: 'legendary',
    store_url: formatEpicStoreUrl(title)
  })

  return true
}

/**
 * Fully loads all files in library into memory.
 *
 * @returns App names of loaded files.
 */
async function loadAll(): Promise<string[]> {
  if (existsSync(legendaryMetadata)) {
    const loadedFiles: string[] = []
    allGames.forEach((appName) => {
      const wasLoaded = loadFile(appName + '.json')
      if (wasLoaded) {
        loadedFiles.push(appName)
      }
    })
    return loadedFiles
  }
  return []
}

/**
 * Checks if a game is in the users account
 * @param appName The game to search for
 * @returns True = Game is in account, False = Game is not in account
 */
export const hasGame = (appName: string) => allGames.has(appName)

export async function runRunnerCommand(
  commandParts: string[],
  abortController: AbortController,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const { dir, bin } = getLegendaryBin()
  return callRunner(
    commandParts,
    { name: 'legendary', logPrefix: LogPrefix.Legendary, bin, dir },
    abortController,
    {
      ...options,
      verboseLogFile: legendaryLogFile
    }
  )
}
