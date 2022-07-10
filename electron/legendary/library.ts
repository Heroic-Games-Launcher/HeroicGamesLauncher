import { CallRunnerOptions, ExecResult } from './../types'
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs'

import { GameConfig } from '../game_config'
import {
  GameInfo,
  InstalledInfo,
  InstallInfo,
  KeyImage,
  RawGameJSON
} from '../types'
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
  installed,
  legendaryConfigPath,
  libraryPath
} from '../constants'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from '../logger/logger'
import { GlobalConfig } from '../config'
import { installStore, libraryStore } from './electronStores'
import { callRunner } from '../launcher'

/**
 * Legendary LegendaryLibrary.
 *
 * For multi-account support, the single global instance will need to become a instance map.
 * @see GameConfig
 */
export class LegendaryLibrary {
  private static globalInstance: LegendaryLibrary = null

  private library: Map<string, null | GameInfo> = new Map()

  private installedGames: Map<string, RawGameJSON>

  /**
   * Private constructor for LegendaryLibrary since we don't really want it to be constructible from outside.
   *
   * @param lazy_load Whether the library loads data lazily or in advance.
   */
  private constructor(lazy_load: boolean) {
    this.refreshInstalled()
    if (!lazy_load) {
      this.loadAll()
    } else {
      this.loadAsStubs()
    }
  }

  /**
   * Get the global library instance, and if it doesn't exist, create one.
   *
   * @param lazy_load Whether the library loads data lazily or in advance. Default: TRUE.
   * @returns LegendaryLibrary instance.
   */
  public static get(lazy_load = true) {
    if (this.globalInstance === null) {
      LegendaryLibrary.globalInstance = new LegendaryLibrary(lazy_load)
    }
    return this.globalInstance
  }

  /**
   * Refresh library.
   */
  public async refresh(): Promise<ExecResult> {
    logInfo('Refreshing Epic Games...', LogPrefix.Legendary)
    const { showUnrealMarket } = await GlobalConfig.get().getSettings()
    const epicOffline = await isEpicServiceOffline()
    if (epicOffline) {
      logWarning(
        'Epic is Offline right now, cannot update game list!',
        LogPrefix.Backend
      )
      return
    }

    const includeUEFlag = showUnrealMarket ? '--include-ue' : ''
    const res = await runLegendaryCommand(['list', includeUEFlag])

    if (res.error) {
      logError(['Failed to refresh library:', res.error], LogPrefix.Legendary)
    }
    this.refreshInstalled()
    this.loadAll()
    return res
  }

  /**
   * Refresh `this.installedGames` from file.
   */
  public refreshInstalled() {
    const installedJSON = `${legendaryConfigPath}/installed.json`
    if (existsSync(installedJSON)) {
      try {
        this.installedGames = new Map(
          Object.entries(JSON.parse(readFileSync(installedJSON, 'utf-8')))
        )
      } catch (error) {
        // disabling log here because its giving false positives on import command
        logError(
          [
            'Corrupted intalled.json file, cannot load installed games',
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
   * Get a list of all games in the library.
   * Please note this loads all library data, thus making lazy loading kind of pointless.
   *
   * @param format Return format. 'info' -> GameInfo, 'class' (default) -> LegendaryGame
   * @param fullRefresh Reload from Legendary.
   * @returns Array of objects.
   */
  public async getGames(
    format: 'info' | 'class' = 'class',
    fullRefresh?: boolean
  ): Promise<(LegendaryGame | GameInfo)[]> {
    logInfo('Refreshing library...', LogPrefix.Legendary)
    const isLoggedIn = await LegendaryUser.isLoggedIn()
    if (!isLoggedIn) {
      return
    }

    if (fullRefresh) {
      try {
        await this.refresh()
      } catch (error) {
        logError(`${error}`, LogPrefix.Legendary)
      }
    }

    try {
      this.refreshInstalled()
      await this.loadAll()
    } catch (error) {
      logError(`${error}`, LogPrefix.Legendary)
    }
    const arr = Array.from(this.library.values())

    if (format === 'info') {
      if (libraryStore.has('library')) {
        libraryStore.delete('library')
      }
      logInfo('Updating game list', LogPrefix.Legendary)
      libraryStore.set('library', arr)
      logInfo('Game List Updated', LogPrefix.Legendary)
      return arr
    }
    if (format === 'class') {
      return arr.map(({ app_name }) => LegendaryGame.get(app_name))
    }
  }

  /**
   * Get game info for a particular game.
   *
   * @param appName
   * @returns GameInfo
   */
  public getGameInfo(appName: string) {
    const info = this.library.get(appName)
    if (info === undefined) {
      return null
    }
    if (info === null) {
      // This assumes that fileName and appName are same.
      // If that changes, this will break.
      this.loadFile(`${appName}.json`)
    }
    return this.library.get(appName)
  }

  /**
   * Get game info for a particular game.
   */
  public async getInstallInfo(
    appName: string,
    installPlatform = 'Windows'
  ): Promise<InstallInfo> {
    const cache = installStore.get(appName) as InstallInfo
    if (cache) {
      logDebug('Using cached install info', LogPrefix.Legendary)
      return cache
    }

    logInfo(`Getting more details with 'legendary info'`, LogPrefix.Legendary)
    const res = await runLegendaryCommand([
      '--pretty-json',
      'info',
      appName,
      '--platform',
      installPlatform,
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

    const info: InstallInfo = JSON.parse(res.stdout)
    installStore.set(appName, info)
    return info
  }

  /**
   * Obtain a list of updateable games.
   *
   * @returns App names of updateable games.
   */
  public async listUpdateableGames() {
    const isLoggedIn = await LegendaryUser.isLoggedIn()

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

    const commandParts = ['list-installed', '--check-updates', '--tsv']

    logInfo('Checking for game updates.', LogPrefix.Legendary)
    const res = await runLegendaryCommand(commandParts)

    if (res.error) {
      logError(
        ['Failed to check for game updates:', res.error],
        LogPrefix.Legendary,
        false
      )
      return []
    }

    const updates = res.stdout
      .split('\n')
      .filter((item) => item.split('\t')[4] === 'True')
      .map((item) => item.split('\t')[0])
      .filter((item) => item.length > 1)
    logInfo(`Found ${updates.length} game(s) to update`, LogPrefix.Legendary)
    return updates
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
  public changeGameInstallPath(appName: string, newPath: string) {
    this.library.get(appName).install.install_path = newPath
    this.installedGames.get(appName).install_path = newPath

    // Modify Legendary installed.json file:
    try {
      const file = JSON.parse(readFileSync(installed, 'utf8'))
      const game = { ...file[appName], install_path: newPath }
      const modifiedInstall = { ...file, [appName]: game }
      writeFileSync(installed, JSON.stringify(modifiedInstall, null, 2))
    } catch (error) {
      logError(
        `Error reading ${installed}, could not complete operation`,
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
      this.library.get(appName).is_installed = false
      this.library.get(appName).install = {} as InstalledInfo
      this.installedGames.delete(appName)
    }
  }

  /**
   * Load configs for installed games into memory.
   */
  public loadGameConfigs() {
    for (const appName of this.installedGames.keys()) {
      GameConfig.get(appName)
    }
  }

  /**
   * Load the file completely into our in-memory library.
   * Largely derived from legacy code.
   *
   * @returns App name of loaded file.
   */
  private loadFile(fileName: string): string {
    fileName = `${libraryPath}/${fileName}`

    try {
      const { app_name, metadata } = JSON.parse(readFileSync(fileName, 'utf-8'))
      const { namespace } = metadata
      const is_game = namespace !== 'ue' ? true : false
      const {
        description,
        shortDescription = '',
        keyImages = [],
        title,
        developer,
        dlcItemList,
        releaseInfo,
        categories,
        customAttributes
      } = metadata

      const dlcs: string[] = []
      const CloudSaveFolder = customAttributes?.CloudSaveFolder
      const FolderName = customAttributes?.FolderName
      const canRunOffline = customAttributes?.CanRunOffline?.value === 'true'

      if (dlcItemList) {
        dlcItemList.forEach(
          (v: { releaseInfo: { [x: number]: { appId: string } } }) => {
            if (v.releaseInfo && v.releaseInfo[0]) {
              dlcs.push(v.releaseInfo[0].appId)
            }
          }
        )
      }

      let is_ue_asset = false
      let is_ue_project = false
      let is_ue_plugin = false
      if (categories) {
        categories.forEach((c: { path: string }) => {
          if (c.path === 'projects') {
            is_ue_project = true
          } else if (c.path === 'assets') {
            is_ue_asset = true
          } else if (c.path === 'plugins') {
            is_ue_plugin = true
          }
        })
      }

      let compatible_apps: string[] = []
      releaseInfo.forEach((rI: { appId: string; compatibleApps: string[] }) => {
        if (rI.appId === app_name) {
          compatible_apps = rI.compatibleApps
        }
      })

      const cloud_save_enabled = is_game && Boolean(CloudSaveFolder?.value)
      const saveFolder = cloud_save_enabled ? CloudSaveFolder.value : ''
      const installFolder = FolderName ? FolderName.value : app_name

      const gameBox = is_game
        ? keyImages.filter(({ type }: KeyImage) => type === 'DieselGameBox')[0]
        : keyImages.filter(({ type }: KeyImage) => type === 'Screenshot')[0]

      const gameBoxTall = is_game
        ? keyImages.filter(
            ({ type }: KeyImage) => type === 'DieselGameBoxTall'
          )[0]
        : gameBox

      const gameBoxStore = is_game
        ? keyImages.filter(
            ({ type }: KeyImage) => type === 'DieselStoreFrontTall'
          )[0]
        : gameBox

      const logo = is_game
        ? keyImages.filter(
            ({ type }: KeyImage) => type === 'DieselGameBoxLogo'
          )[0]
        : keyImages.filter(({ type }: KeyImage) => type === 'Thumbnail')[0]

      const art_cover = gameBox ? gameBox.url : null
      const art_logo = logo ? logo.url : null
      const art_square = gameBoxTall ? gameBoxTall.url : null
      const art_square_front = gameBoxStore ? gameBoxStore.url : null

      const info = this.installedGames.get(app_name)
      const {
        executable = null,
        version = null,
        install_size = null,
        install_path = null,
        platform,
        is_dlc = metadata.categories.filter(
          ({ path }: { path: string }) => path === 'dlc'
        ).length || dlcs.includes(app_name)
      } = (info === undefined ? {} : info) as InstalledInfo

      const convertedSize = install_size && getFileSize(Number(install_size))

      this.library.set(app_name, {
        app_name,
        art_cover: art_cover || art_square || fallBackImage,
        art_logo,
        art_square:
          art_square || art_square_front || art_cover || fallBackImage,
        cloud_save_enabled,
        compatible_apps,
        developer,
        extra: {
          about: {
            description,
            shortDescription
          },
          reqs: {}
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
        is_game,
        is_installed: info !== undefined,
        is_ue_asset,
        is_ue_plugin,
        is_ue_project,
        namespace,
        is_mac_native: info
          ? platform === 'Mac'
          : releaseInfo[0]?.platform.includes('Mac'),
        save_folder: saveFolder,
        title,
        canRunOffline,
        is_linux_native: false,
        runner: 'legendary',
        store_url: formatEpicStoreUrl(title)
      } as GameInfo)

      return app_name
    } catch (error) {
      logError(
        `Library file corrupted, please check ${fileName}`,
        LogPrefix.Legendary,
        false
      )
    }
  }

  /**
   * Load the file partially, signalling that yes this is part of the library,
   * but we don't have it loaded fully. Saves on memory.
   *
   * @returns App name of loaded file.
   */
  private loadFileStub(fileName: string): string {
    fileName = `${libraryPath}/${fileName}`
    try {
      const { app_name } = JSON.parse(readFileSync(fileName, 'utf-8'))
      this.library.set(app_name, null)
      return app_name
    } catch (error) {
      logError(`Metadata for ${fileName} corrupted`, LogPrefix.Legendary)
      return 'error'
    }
  }

  /**
   * Fully loads all files in library into memory.
   *
   * @returns App names of loaded files.
   */
  private async loadAll(): Promise<string[]> {
    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath).map((filename) => this.loadFile(filename))
    }
  }

  /**
   * Fully loads all stubbed files in library into memory.
   * Currently unused.
   *
   * @returns App names of loaded files.
   */
  public async loadAllStubs(): Promise<string[]> {
    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath)
        .filter((fileName) => {
          const app_name = fileName.split('.json')[0]
          return this.library.get(app_name) === null
        })
        .map((filename) => this.loadFile(filename))
    }
  }

  /**
   * Stub loads all files in library into memory.
   *
   * @returns App names of loaded files.
   */
  private async loadAsStubs(): Promise<string[]> {
    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath).map((filename) =>
        this.loadFileStub(filename)
      )
    }
  }
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
