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
import { LegendaryGame } from './games'
import { LegendaryUser } from './user'
import {
  formatEpicStoreUrl,
  getLegendaryBin,
  isEpicServiceOffline,
  isOnline,
  getFileSize
} from '../utils'
import {
  fallBackImage,
  legendaryConfigPath,
  legendaryMetadata
} from '../constants'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from '../logger/logger'
import { installStore, libraryStore } from './electronStores'
import { callRunner } from '../launcher'
import { join } from 'path'

/**
 * Legendary LegendaryLibrary.
 *
 * For multi-account support, the single global instance will need to become a instance map.
 * @see GameConfig
 */
export class LegendaryLibrary {
  private static globalInstance: LegendaryLibrary

  private allGames: Set<string> = new Set()
  private installedGames: Map<string, InstalledJsonMetadata> = new Map()
  private library: Map<string, GameInfo> = new Map()

  /**
   * Private constructor for LegendaryLibrary since we don't really want it to be constructible from outside.
   */
  private constructor() {
    this.loadGamesInAccount()
  }

  /**
   * Get the global library instance, and if it doesn't exist, create one.
   *
   * @returns LegendaryLibrary instance.
   */
  public static get() {
    if (!this.globalInstance) {
      LegendaryLibrary.globalInstance = new LegendaryLibrary()
    }
    return this.globalInstance
  }

  /**
   * Loads all of the user's games into `this.allGames`
   */
  public loadGamesInAccount() {
    if (!existsSync(legendaryMetadata)) {
      return
    }
    readdirSync(legendaryMetadata).forEach((filename) => {
      // This shouldn't ever happen, but just in case
      if (!filename.endsWith('.json')) {
        return
      }
      const appName = filename.split('.').at(0)!
      this.allGames.add(appName)
    })
  }

  /**
   * Refresh games in the user's library.
   */
  public async refresh(): Promise<ExecResult> {
    logInfo('Refreshing Epic Games...', LogPrefix.Legendary)
    const epicOffline = await isEpicServiceOffline()
    if (epicOffline) {
      logWarning(
        'Epic is Offline right now, cannot update game list!',
        LogPrefix.Backend
      )
      return { stderr: 'Epic offline, unable to update game list', stdout: '' }
    }

    const res = await runLegendaryCommand(['list'])

    if (res.error) {
      logError(['Failed to refresh library:', res.error], LogPrefix.Legendary)
    }
    this.refreshInstalled()
    return res
  }

  /**
   * Refresh `this.installedGames` from file.
   */
  public refreshInstalled() {
    const installedJSON = join(legendaryConfigPath, 'installed.json')
    if (existsSync(installedJSON)) {
      try {
        this.installedGames = new Map(
          Object.entries(JSON.parse(readFileSync(installedJSON, 'utf-8')))
        )
      } catch (error) {
        // disabling log here because its giving false positives on import command
        logError(
          [
            'Corrupted installed.json file, cannot load installed games',
            `${error}`
          ],
          LogPrefix.Legendary,
          false
        )
        this.installedGames = new Map()
      }
    } else {
      this.installedGames = new Map()
    }
  }

  /**
   * Get the game info of all games in the library
   *
   * @param fullRefresh Reload from Legendary.
   * @returns Array of objects.
   */
  public async getGames(fullRefresh = false): Promise<GameInfo[]> {
    logInfo('Refreshing library...', LogPrefix.Legendary)
    const isLoggedIn = LegendaryUser.isLoggedIn()
    if (!isLoggedIn) {
      return []
    }

    if (fullRefresh) {
      this.refresh()
    }
    this.loadGamesInAccount()
    this.refreshInstalled()

    try {
      await this.loadAll()
    } catch (error) {
      logError(`${error}`, LogPrefix.Legendary)
    }
    const arr = Array.from(this.library.values())

    if (libraryStore.has('library')) {
      libraryStore.delete('library')
    }
    libraryStore.set('library', arr)
    logInfo(
      ['Game list updated, got', `${arr.length}`, 'games & DLCs'],
      LogPrefix.Legendary
    )
    return arr
  }

  /**
   * Get game info for a particular game.
   *
   * @param appName
   * @returns GameInfo
   */
  public getGameInfo(appName: string): GameInfo | undefined {
    if (!this.hasGame(appName)) {
      logWarning(
        ['Requested game', appName, 'was not found in library'],
        LogPrefix.Legendary
      )
      return
    }
    // We have the game, but info wasn't loaded yet
    if (!this.library.has(appName)) {
      this.loadFile(appName + '.json')
    }
    return this.library.get(appName)
  }

  /**
   * Get game info for a particular game.
   */
  public async getInstallInfo(
    appName: string,
    installPlatform: InstallPlatform
  ): Promise<LegendaryInstallInfo> {
    const cache = installStore.get(appName) as LegendaryInstallInfo
    if (cache) {
      logDebug('Using cached install info', LogPrefix.Legendary)
      return cache
    }

    logInfo(`Getting more details with 'legendary info'`, LogPrefix.Legendary)
    const res = await runLegendaryCommand([
      'info',
      appName,
      ...(installPlatform ? ['--platform', installPlatform] : []),
      '--json',
      (await isEpicServiceOffline()) ? '--offline' : ''
    ])

    if (res.error) {
      logError(
        ['Failed to get more details:', res.error],
        LogPrefix.Legendary,
        false
      )
    }

    const info: LegendaryInstallInfo = JSON.parse(res.stdout)
    installStore.set(appName, info)
    return info
  }

  /**
   * Obtain a list of updateable games.
   *
   * @returns App names of updateable games.
   */
  public async listUpdateableGames(): Promise<string[]> {
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

    const res = await runLegendaryCommand(['list'], {
      logMessagePrefix: 'Checking for game updates'
    })

    if (res.error) {
      logError(
        ['Failed to check for game updates:', res.error],
        LogPrefix.Legendary,
        false
      )
      return []
    }

    // Once we ran `legendary list`, `assets.json` will be updated with the newest
    // game versions, and `installed.json` has our currently installed ones
    const installedJson: Record<string, InstalledJsonMetadata> = JSON.parse(
      readFileSync(join(legendaryConfigPath, 'installed.json')).toString()
    )
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
    const assetsJson: Record<string, Record<string, string>[]> = JSON.parse(
      readFileSync(join(legendaryConfigPath, 'assets.json')).toString()
    )
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
  public async updateAllGames() {
    return (
      await Promise.allSettled(
        (await this.listUpdateableGames())
          .map(LegendaryGame.get)
          .map(async (game) => game.update())
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
  public async changeGameInstallPath(appName: string, newPath: string) {
    // @ts-expect-error TODO: Verify appName is valid here
    this.library.get(appName).install.install_path = newPath
    // @ts-expect-error Same as above
    this.installedGames.get(appName).install_path = newPath

    const { error } = await runLegendaryCommand([
      'move',
      appName,
      newPath,
      '--skip-move'
    ])
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
  public installState(appName: string, state: boolean) {
    if (state) {
      // This assumes that fileName and appName are same.
      // If that changes, this will break.
      this.loadFile(`${appName}.json`)
    } else {
      // @ts-expect-error TODO: Make sure game info is loaded & appName is valid here
      this.library.get(appName).is_installed = false
      // @ts-expect-error Same as above
      this.library.get(appName).install = {} as InstalledInfo
      this.installedGames.delete(appName)
    }
  }

  /**
   * Load the file completely into our in-memory library.
   * Largely derived from legacy code.
   *
   * @returns True/False, whether or not the file was loaded
   */
  private loadFile(fileName: string): boolean {
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
      longDescription = '',
      keyImages = [],
      title,
      developer,
      dlcItemList,
      releaseInfo,
      customAttributes
    } = metadata

    const dlcs: string[] = []
    const CloudSaveFolder = customAttributes?.CloudSaveFolder
    const FolderName = customAttributes?.FolderName
    const canRunOffline = customAttributes?.CanRunOffline?.value === 'true'

    if (dlcItemList) {
      dlcItemList.forEach((v: { releaseInfo: { appId: string }[] }) => {
        if (v.releaseInfo && v.releaseInfo[0]) {
          dlcs.push(v.releaseInfo[0].appId)
        }
      })
    }

    const cloud_save_enabled = Boolean(CloudSaveFolder?.value)
    const saveFolder = cloud_save_enabled ? CloudSaveFolder.value : ''
    const installFolder = FolderName ? FolderName.value : app_name

    const gameBox = keyImages.find(({ type }) => type === 'DieselGameBox')

    const gameBoxTall = keyImages.find(
      ({ type }) => type === 'DieselGameBoxTall'
    )

    const gameBoxStore = keyImages.find(
      ({ type }) => type === 'DieselStoreFrontTall'
    )

    const logo = keyImages.find(({ type }) => type === 'DieselGameBoxLogo')

    const art_cover = gameBox ? gameBox.url : undefined
    const art_logo = logo ? logo.url : undefined
    const art_square = gameBoxTall ? gameBoxTall.url : undefined
    const art_square_front = gameBoxStore ? gameBoxStore.url : undefined

    const info = this.installedGames.get(app_name)
    const { executable, version, install_size, install_path, platform } =
      info ?? {}

    const is_dlc = Boolean(metadata.mainGameItem)

    const convertedSize = install_size ? getFileSize(Number(install_size)) : '0'

    this.library.set(app_name, {
      app_name,
      art_cover: art_cover || art_square || fallBackImage,
      art_logo,
      art_square: art_square || art_square_front || art_cover || fallBackImage,
      cloud_save_enabled,
      developer,
      extra: {
        about: {
          description,
          longDescription
        },
        reqs: []
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
      title,
      canRunOffline,
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
  private async loadAll(): Promise<string[]> {
    if (existsSync(legendaryMetadata)) {
      const loadedFiles: string[] = []
      this.allGames.forEach((appName) => {
        const wasLoaded = this.loadFile(appName + '.json')
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
  public hasGame = (appName: string) => this.allGames.has(appName)
}

export async function runLegendaryCommand(
  commandParts: string[],
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const { dir, bin } = getLegendaryBin()
  return callRunner(
    commandParts,
    { name: 'legendary', logPrefix: LogPrefix.Legendary, bin, dir },
    options
  )
}
