import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs'
import prettyBytes from 'pretty-bytes'

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
import { execAsync, isEpicOffline, isOnline } from '../utils'
import {
  installed,
  legendaryBin,
  legendaryConfigPath,
  libraryPath
} from '../constants'
import { logError, logInfo, logWarning } from '../logger'
import { spawn } from 'child_process'
import Store from 'electron-store'
import { GlobalConfig } from '../config'

const libraryStore = new Store({
  cwd: 'lib-cache',
  name: 'library'
})

const installStore = new Store({
  cwd: 'lib-cache',
  name: 'installInfo'
})

/**
 * Legendary LegendaryLibrary.
 *
 * For multi-account support, the single global instance will need to become a instance map.
 * @see GameConfig
 */
class LegendaryLibrary {
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
  public async refresh() {
    logInfo('Refreshing Epic Games...')
    const { showUnrealMarket } = await GlobalConfig.get().getSettings()
    const epicOffline = await isEpicOffline()
    if (epicOffline) {
      logWarning('Epic is Offline right now, cannot update game list!')
      return
    }

    return new Promise((res, rej) => {
      const getUeAssets = showUnrealMarket ? '--include-ue' : ''
      const child = spawn(legendaryBin, ['list-games', getUeAssets])
      child.stderr.on('data', (data) => {
        console.log(`${data}`)
      })
      child.on('error', (err) => rej(`${err}`))
      child.on('close', () => res('finished'))
    })
      .then(() => {
        this.refreshInstalled()
        this.loadAll()
      })
      .catch((err) => {
        logError(err)
      })
  }

  /**
   * Refresh `this.installedGames` from file.
   */
  public refreshInstalled() {
    const installedJSON = `${legendaryConfigPath}/installed.json`
    if (existsSync(installedJSON)) {
      this.installedGames = new Map(
        Object.entries(JSON.parse(readFileSync(installedJSON, 'utf-8')))
      )
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
    logInfo('Refreshing library...')
    const isLoggedIn = await LegendaryUser.isLoggedIn()
    if (!isLoggedIn) {
      return
    }

    if (fullRefresh) {
      try {
        logInfo('Legendary: Refreshing Epic Games...')
        await this.refresh()
      } catch (error) {
        logError(error)
      }
    }

    try {
      this.refreshInstalled()
      await this.loadAll()
    } catch (error) {
      logError(error)
    }
    const arr = Array.from(this.library.values()).sort(
      (a: { title: string }, b: { title: string }) => {
        const gameA = a.title.toUpperCase()
        const gameB = b.title.toUpperCase()
        return gameA < gameB ? -1 : 1
      }
    )
    if (format === 'info') {
      if (libraryStore.has('library')) {
        libraryStore.delete('library')
      }
      logInfo('Updating game list')
      libraryStore.set('library', arr)
      logInfo('Game List Updated')
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
  public async getGameInfo(appName: string) {
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
   *
   * @param appName
   * @returns InstallInfo
   */
  public async getInstallInfo(appName: string) {
    const cache = installStore.get(appName) as InstallInfo
    logInfo('Getting More details with Legendary info command... ')
    if (cache) {
      return cache
    }
    try {
      const { stdout } = await execAsync(
        `${legendaryBin} -J info ${appName} --json`
      )
      const info: InstallInfo = JSON.parse(stdout)
      installStore.set(appName, info)
      return info
    } catch (error) {
      logError('Error running the Legendary Info command')
      console.log({ error })
    }
  }

  /**
   * Obtain a list of updateable games.
   *
   * @returns App names of updateable games.
   */
  public async listUpdateableGames() {
    const isLoggedIn = await LegendaryUser.isLoggedIn()

    const online = await isOnline()
    if (!isLoggedIn || !online) {
      return []
    }

    const command = `${legendaryBin} list-installed --check-updates --tsv`
    try {
      const { stdout } = await execAsync(command)
      logInfo('Checking for game updates')
      const updates = stdout
        .split('\n')
        .filter((item) => item.split('\t')[4] === 'True')
        .map((item) => item.split('\t')[0])
        .filter((item) => item.length > 1)
      logInfo(`Found ${updates.length} game(s) to update`)
      return updates
    } catch (error) {
      logError(error)
    }
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
          .map((game) => game.update())
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
    const file = JSON.parse(readFileSync(installed, 'utf8'))
    const game = { ...file[appName], install_path: newPath }
    const modifiedInstall = { ...file, [appName]: game }
    writeFileSync(installed, JSON.stringify(modifiedInstall, null, 2))
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
        if (c.path == 'projects') {
          is_ue_project = true
        } else if (c.path == 'assets') {
          is_ue_asset = true
        } else if (c.path == 'plugins') {
          is_ue_plugin = true
        }
      })
    }

    let compatible_apps: string[] = []
    releaseInfo.forEach((rI: { appId: string; compatibleApps: string[] }) => {
      if (rI.appId == app_name) {
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

    const fallBackImage =
      'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg'

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

    const convertedSize = install_size && prettyBytes(Number(install_size))

    this.library.set(app_name, {
      app_name,
      art_cover: art_cover || art_square || fallBackImage,
      art_logo,
      art_square: art_square || art_square_front || art_cover || fallBackImage,
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
      canRunOffline
    } as GameInfo)

    return app_name
  }

  /**
   * Load the file partially, signalling that yes this is part of the library,
   * but we don't have it loaded fully. Saves on memory.
   *
   * @returns App name of loaded file.
   */
  private loadFileStub(fileName: string): string {
    fileName = `${libraryPath}/${fileName}`
    const { app_name } = JSON.parse(readFileSync(fileName, 'utf-8'))
    this.library.set(app_name, null)

    return app_name
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

export { LegendaryLibrary }
