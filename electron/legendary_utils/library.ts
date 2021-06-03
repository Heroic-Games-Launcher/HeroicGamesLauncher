import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs';
import prettyBytes from 'pretty-bytes';

import { GameConfig } from '../game_config';
import {
  GameInfo,
  InstalledInfo,
  KeyImage,
  RawGameJSON
} from '../types';
import { LegendaryGame } from '../games';
import {
  execAsync,
  isOnline
} from '../utils';
import {
  installed,
  legendaryBin,
  legendaryConfigPath,
  libraryPath
} from '../constants';

/**
 * Legendary Library.
 *
 * For multi-account support, the single global instance will need to become a instance map.
 * @see GameConfig
 */
class Library {
  private static globalInstance: Library = null

  private library: Map<string, null | GameInfo> = new Map()

  private installedGames : Map<string, RawGameJSON>

  /**
   * Private constructor for Library since we don't really want it to be constructible from outside.
   *
   * @param lazy_load Whether the library loads data lazily or in advance.
   */
  private constructor(lazy_load: boolean) {
    this.refreshInstalled()
    if (!lazy_load) {
      this.loadAll()
    }
    else {
      this.loadAsStubs()
    }
    this.loadGameConfigs()
  }

  /**
   * Get the global library instance, and if it doesn't exist, create one.
   *
   * @param lazy_load Whether the library loads data lazily or in advance. Default: TRUE.
   * @returns Library instance.
   */
  public static get(lazy_load = true) {
    if (this.globalInstance === null) {
      Library.globalInstance = new Library(lazy_load)
    }
    return this.globalInstance
  }

  /**
   * Refresh library.
   */
  public async refresh() {
    await execAsync(`${legendaryBin} list-games --include-ue`)

    this.refreshInstalled()
    this.loadAll()
  }

  /**
   * Refresh `this.installedGames` from file.
   */
  public refreshInstalled() {
    const installedJSON = `${legendaryConfigPath}/installed.json`
    if (existsSync(installedJSON)) {
      this.installedGames = new Map(Object.entries(JSON.parse(readFileSync(installedJSON, 'utf-8'))))
    }
    else {
      this.installedGames = new Map()
    }
  }

  /**
   * Get a list of all games in the library.
   * Please note this loads all library data, thus making lazy loading kind of pointless.
   *
   * @param format Return format. 'info' -> GameInfo, 'class' (default) -> LegendaryGame
   * @returns Array of objects.
   */
  public async getGames(format: 'info' | 'class' = 'class') : Promise<(LegendaryGame | GameInfo)[]> {
    await this.loadAllStubs()
    const arr = Array.from(this.library.values()).sort(
      (a: { title: string }, b: { title: string }) => {
        const gameA = a.title.toUpperCase()
        const gameB = b.title.toUpperCase()
        return gameA < gameB ? -1 : 1
      }
    )
    if (format === 'info') {
      return arr
    }
    if (format === 'class') {
      return arr.map(({app_name}) => LegendaryGame.get(app_name))
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
   * Obtain a list of updateable games.
   *
   * @returns App names of updateable games.
   */
  public async listUpdateableGames() {
    if (!(await isOnline())) {
      console.log('App offline, skipping checking game updates.')
      return []
    }

    const command = `${legendaryBin} list-installed --check-updates --tsv`
    const { stdout } = await execAsync(command)
    const result = stdout
      .split('\n')
      .filter((item) => item.includes('True'))
      .map((item) => item.split('\t')[0])

    result.pop()
    return result
  }

  /**
   * Update all updateable games.
   * Uses `listUpdateableGames` along with `LegendaryGame.update`
   *
   * @returns Array of results of `Game.update`.
   */
  public async updateAllGames() {
    return (await Promise.allSettled((await this.listUpdateableGames()).map(LegendaryGame.get).map(
      (game) => game.update()
    ))).map((res) => {
      if (res.status === 'fulfilled') {
        return res.value
      }
      else {
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
  public changeGameInstallPath(appName : string, newPath : string) {
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
  public installState(appName : string, state : boolean) {
    if (state) {
      // This assumes that fileName and appName are same.
      // If that changes, this will break.
      this.loadFile(`${appName}.json`)
    }
    else {
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
  private loadFile(fileName : string) : string {
    fileName = `${libraryPath}/${fileName}`
    const { app_name, metadata, asset_info } = JSON.parse(readFileSync(fileName, 'utf-8'))
    const { namespace } = asset_info
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
      categories.forEach(
        (c: { path : string} ) => {
          if (c.path == 'projects') {
            is_ue_project = true
          } else if (c.path == 'assets') {
            is_ue_asset = true
          } else if (c.path == 'plugins') {
            is_ue_plugin = true
          }
        }
      )
    }

    let compatible_apps: string[] = []
    releaseInfo.forEach(
      (rI: { appId : string, compatibleApps : string[] } ) => {
        if (rI.appId == app_name) {
          compatible_apps = rI.compatibleApps
        }
      }
    )

    const cloud_save_enabled = is_game && Boolean(CloudSaveFolder?.value)
    const saveFolder = cloud_save_enabled ? CloudSaveFolder.value : ''
    const installFolder = FolderName ? FolderName.value : app_name

    const gameBox = is_game ?
      keyImages.filter(({ type }: KeyImage) => type === 'DieselGameBox' )[0] :
      keyImages.filter(({ type }: KeyImage) => type === 'Screenshot' )[0]

    const gameBoxTall = is_game ?
      keyImages.filter(({ type }: KeyImage) => type === 'DieselGameBoxTall' )[0] :
      gameBox

    const gameBoxStore = is_game ?
      keyImages.filter(({ type }: KeyImage) => type === 'dieselStoreFrontTall' )[0] :
      gameBox

    const logo = is_game ?
      keyImages.filter(({ type }: KeyImage) => type === 'DieselGameBoxLogo' )[0] :
      keyImages.filter(({ type }: KeyImage) => type === 'Thumbnail' )[0]

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
      is_dlc = dlcs.includes(app_name)
    } = (info === undefined ? {} : info) as InstalledInfo

    const convertedSize =
      install_size && prettyBytes(Number(install_size))

    this.library.set(app_name, {
      app_name,
      art_cover: art_cover || art_square || fallBackImage,
      art_logo,
      art_square: art_square || art_square_front || art_cover || fallBackImage,
      cloud_save_enabled,
      compatible_apps,
      developer,
      extra: {
        about : {
          description,
          shortDescription
        },
        reqs : {}
      },
      folder_name: installFolder,
      install: ({
        executable,
        install_path,
        install_size: convertedSize,
        is_dlc,
        version
      }),
      is_game,
      is_installed: info !== undefined,
      is_ue_asset,
      is_ue_plugin,
      is_ue_project,
      namespace,
      save_folder: saveFolder,
      title
    } as GameInfo)

    return app_name
  }

  /**
   * Load the file partially, signalling that yes this is part of the library,
   * but we don't have it loaded fully. Saves on memory.
   *
   * @returns App name of loaded file.
   */
  private loadFileStub(fileName : string) : string {
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
  private async loadAll() : Promise<string[]> {
    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath)
        .map((filename) => this.loadFile(filename))
    }
  }

  /**
   * Fully loads all stubbed files in library into memory.
   * Currently unused.
   *
   * @returns App names of loaded files.
   */
  public async loadAllStubs() : Promise<string[]> {
    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath)
        .filter((fileName) => {
          const app_name =fileName.split('.json')[0]
          return (this.library.get(app_name) === null)
        })
        .map((filename) => this.loadFile(filename))
    }
  }

  /**
   * Stub loads all files in library into memory.
   *
   * @returns App names of loaded files.
   */
  private async loadAsStubs() : Promise<string[]> {
    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath)
        .map((filename) => this.loadFileStub(filename))
    }
  }
}

export { Library };
