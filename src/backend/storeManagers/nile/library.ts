import JSON5 from 'json5'
import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logWarning
} from 'backend/logger'
import { CallRunnerOptions, ExecResult, GameInfo } from 'common/types'
import {
  FuelSchema,
  NileGameDownloadInfo,
  NileGameInfo,
  NileInstallInfo,
  NileInstallMetadataInfo
} from 'common/types/nile'
import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { installStore, libraryStore } from './electronStores'
import { getFileSize, getNileBin, removeSpecialcharacters } from 'backend/utils'
import { callRunner } from 'backend/launcher'
import { dirname, join } from 'path'
import { app } from 'electron'
import { copySync } from 'fs-extra'
import { NileUser } from './user'
import { runNileCommandStub } from './e2eMock'
import { nileConfigPath, nileInstalled, nileLibrary } from './constants'
import type { LibraryManager } from 'common/types/game_manager'

export default class NileLibraryManager implements LibraryManager {
private installedGames: Map<string, NileInstallMetadataInfo> = new Map()
private library: Map<string, GameInfo> = new Map()

async init() {
  // Migrate user data from global Nile config if necessary
  const globalNileConfig = join(app.getPath('appData'), 'nile')
  if (!existsSync(nileConfigPath) && existsSync(globalNileConfig)) {
    copySync(globalNileConfig, nileConfigPath)
    await NileUser.getUserData()
  }

  this.refresh()
}

/**
 * Loads all the user's games into `library`
 */
loadGamesInAccount() {
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
      details: {
        shortDescription,
        developer,
        genres,
        releaseDate,
        backgroundUrl1,
        backgroundUrl2,
        logoUrl
      },
      iconUrl
    } = productDetail

    const info = this.installedGames.get(product.id)
    // Create save folder name like nile
    const safeFolderName = removeSpecialcharacters(title ?? '')
    this.library.set(product.id, {
      app_name: product.id,
      art_cover: backgroundUrl2 || iconUrl,
      art_logo: logoUrl,
      art_background: backgroundUrl1 || backgroundUrl2,
      art_square: iconUrl,
      canRunOffline: true, // Amazon Games only has offline games
      install: info
        ? {
            install_path: info.path,
            // For some time size was undefined in installed.json, that's why we
            // need to keep this fallback to 0
            install_size: getFileSize(info.size ?? 0),
            version: info.version,
            platform: 'Windows' // Amazon Games only supports Windows
          }
        : {},
      folder_name: safeFolderName,
      is_installed: info !== undefined,
      runner: 'nile',
      title: title ?? '???',
      description: shortDescription,
      developer,
      extra: {
        reqs: [],
        genres,
        releaseDate
      },
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
removeFromInstalledConfig(appName: string) {
  this.installedGames.clear()
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
fetchFuelJSON(
  appName: string,
  installedPath?: string
): FuelSchema | null {
  const game = this.getGameInfo(appName)
  const basePath = installedPath ?? game?.install.install_path
  if (!basePath) {
    logError(['Could not find install path for', appName], LogPrefix.Nile)
    return null
  }

  const fuelJSONPath = join(basePath, 'fuel.json')
  logDebug(['fuel.json path:', fuelJSONPath], LogPrefix.Nile)

  if (!existsSync(fuelJSONPath)) {
    return null
  }

  try {
    return JSON5.parse(readFileSync(fuelJSONPath, 'utf-8'))
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
async listUpdateableGames(): Promise<string[]> {
  if (!NileUser.isLoggedIn()) {
    return []
  }
  logInfo('Looking for updates...', LogPrefix.Nile)

  const { stdout: output } = await this.runRunnerCommand(
    ['list-updates', '--json'],
    { abortId: 'nile-list-updates' }
  )

  if (!output) {
    /*
     * Nothing installed: nothing to update, output will be empty and JSON.parse can't
     * handle empty strings (they aren't proper JSON).
     */
    return []
  }

  const updates: string[] = JSON.parse(output)
  if (updates.length) {
    logInfo(['Found', `${updates.length}`, 'games to update'], LogPrefix.Nile)
  }
  return updates
}

/**
 * Refresh games in the user's library
 */
private async refreshNile(): Promise<ExecResult> {
  logInfo('Refreshing Amazon Games...', LogPrefix.Nile)

  const res = await this.runRunnerCommand(['library', 'sync'], {
    abortId: 'nile-refresh'
  })

  if (res.error) {
    logError(['Failed to refresh library:', res.error], LogPrefix.Nile)
  }
  return {
    stderr: '',
    stdout: ''
  }
}

getInstallMetadata(
  appName: string
): NileInstallMetadataInfo | undefined {
  if (!existsSync(nileInstalled)) {
    return
  }

  try {
    const installed: NileInstallMetadataInfo[] = JSON.parse(
      readFileSync(nileInstalled, 'utf-8')
    )
    return installed.find((game) => game.id === appName)
  } catch (error) {
    logError(
      ['Corrupted installed.json file, cannot load installed games', error],
      LogPrefix.Nile
    )
  }
  return
}

/**
 * Refresh `installedGames` from file.
 */
refreshInstalled() {
  this.installedGames.clear()
  if (existsSync(nileInstalled)) {
    try {
      const installed: NileInstallMetadataInfo[] = JSON.parse(
        readFileSync(nileInstalled, 'utf-8')
      )
      installed.forEach((metadata) => {
        this.installedGames.set(metadata.id, metadata)
      })
    } catch (error) {
      logError(
        ['Corrupted installed.json file, cannot load installed games', error],
        LogPrefix.Nile
      )
    }
  }
}

private defaultExecResult = {
  stderr: '',
  stdout: ''
}

/**
 * Get the game info of all games in the library
 *
 * @returns Array of objects.
 */
async refresh(): Promise<ExecResult | null> {
  if (!NileUser.isLoggedIn()) {
    return this.defaultExecResult
  }
  logInfo('Refreshing library...', LogPrefix.Nile)

  this.refreshNile()
  this.refreshInstalled()
  this.loadGamesInAccount()

  const arr = Array.from(this.library.values())
  libraryStore.set('library', arr)
  logInfo(['Game list updated, got', `${arr.length}`, 'games'], LogPrefix.Nile)

  return this.defaultExecResult
}

/**
 * Get game info for a particular game.
 *
 * @param appName The AppName of the game you want the info of
 * @param forceReload Discards game info in `library` and always reads info from metadata files
 * @returns GameInfo
 */
getGameInfo(
  appName: string,
  forceReload = false
): GameInfo | undefined {
  if (!forceReload) {
    const gameInMemory = this.library.get(appName)
    if (gameInMemory) {
      return gameInMemory
    }
  }

  logInfo(['Loading', appName, 'from metadata files'], LogPrefix.Nile)
  this.refreshInstalled()
  this.loadGamesInAccount()

  const game = this.library.get(appName)
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
async getInstallInfo(
  appName: string
): Promise<NileInstallInfo> {
  const cache = installStore.get(appName)
  if (cache) {
    logDebug('Using cached install info', LogPrefix.Nile)
    return cache
  }

  logInfo('Getting more details', LogPrefix.Nile)
  this.refreshInstalled()

  const game = this.library.get(appName)
  if (game) {
    const metadata = this.installedGames.get(appName)
    // Get size info from Nile
    const { stdout: output } = await this.runRunnerCommand(
      ['install', '--info', '--json', appName],
      { abortId: appName }
    )

    const { download_size }: NileGameDownloadInfo = JSON.parse(output)
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
async changeGameInstallPath(
  appName: string,
  newAppPath: string
) {
  const libraryGameInfo = this.library.get(appName)
  if (libraryGameInfo) libraryGameInfo.install.install_path = newAppPath
  else {
    logWarning(
      `library game info not found in changeGameInstallPath for ${appName}`,
      LogPrefix.Nile
    )
  }

  this.updateInstalledPathInJSON(appName, newAppPath)
}

private updateInstalledPathInJSON(appName: string, newAppPath: string) {
  // Make sure we get the latest installed info
  this.refreshInstalled()

  const installedGameInfo = this.installedGames.get(appName)
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
    JSON.stringify(Array.from(this.installedGames.values())),
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
installState(appName: string, state: boolean) {
  if (!state) {
    this.installedGames.delete(appName)
    installStore.delete(appName)
    return
  }

  const metadata = this.getInstallMetadata(appName)
  if (!metadata) {
    logError(['Could not find install metadata for', appName], LogPrefix.Nile)
    return
  }
  this.installedGames.set(appName, metadata)
}

async runRunnerCommand(
  commandParts: string[],
  options?: CallRunnerOptions
): Promise<ExecResult> {
  if (process.env.CI === 'e2e') {
    return runNileCommandStub(commandParts)
  }

  const { dir, bin } = getNileBin()

  // Set NILE_CONFIG_PATH to a custom, Heroic-specific location so user-made
  // changes to Nile's main config file don't affect us
  if (!options) {
    options = {}
  }
  if (!options.env) {
    options.env = {}
  }
  options.env.NILE_CONFIG_PATH = dirname(nileConfigPath)

  return callRunner(
    commandParts,
    { name: 'nile', logPrefix: LogPrefix.Nile, bin, dir },
    options
  )
}

getLaunchOptions = () => []

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
changeVersionPinnedStatus(appName: string, status: boolean) {
  logWarning(
    'changeVersionPinnedStatus not implemented on Nile Library Manager'
  )
}
}
