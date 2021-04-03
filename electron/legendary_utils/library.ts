import { existsSync, readFileSync, readdirSync } from 'graceful-fs'
import prettyBytes from 'pretty-bytes'

import { GameInfo, InstalledInfo, KeyImage, RawGameJSON } from '../types'
import { LegendaryGame } from '../games'
import { execAsync, isOnline, statAsync } from '../utils'
import { legendaryBin, legendaryConfigPath, libraryPath } from '../constants'


class Library {
  private static globalInstance: Library = null

  private library: Map<string, null | GameInfo> = new Map()

  /**
   * Private constructor for Library since we don't really want multiple instances around.
   * Atleast not before multi-account support.
   *
   * @param lazy_load Whether the library loads data lazily or in advance.
   */
  private constructor(lazy_load: boolean) {
    if (!lazy_load) {
      this.loadAll()
    }
    else {
      this.loadAsStubs()
    }
  }

  /**
   * Get the global library instance, and if it doesn't exist, create one.
   *
   * @param lazy_load Whether the library loads data lazily or in advance. Default: TRUE.
   * @returns Library instance.
   */
  public static get(lazy_load = false) {
    if (this.globalInstance === null) {
      Library.globalInstance = new Library(lazy_load)
    }
    return this.globalInstance
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

  public async getGameInfo(app_name: string) {
    const info = this.library.get(app_name)
    if (info === undefined) {
      return null
    }
    if (info === null) {
      // This assumes that fileName and appName are same.
      // If that changes, this will break.
      this.loadFile(`${app_name}.json`)
    }
    return this.library.get(app_name)
  }

  public async listUpdateableGames() {
    if (!(await isOnline())) {
      console.log('App offline, skipping checking game updates.')
      return []
    }
    const command = `${legendaryBin} list-installed --check-updates --tsv | grep True | awk '{print $1}'`
    const { stdout } = await execAsync(command)
    const result = stdout.split('\n')
    return result
  }

  public async updateAllGames() {
    return (await this.listUpdateableGames()).map(LegendaryGame.get).map(
      (game) => game.update()
    )
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
    const {
      description,
      shortDescription = '',
      keyImages,
      title,
      developer,
      dlcItemList,
      customAttributes: { CloudSaveFolder, FolderName }
    } = metadata

    const { namespace } = asset_info

    const dlcs: string[] = []

    if (dlcItemList) {
      dlcItemList.forEach(
        (v: { releaseInfo: { [x: number]: { appId: string } } }) => {
          if (v.releaseInfo && v.releaseInfo[0]) {
            dlcs.push(v.releaseInfo[0].appId)
          }
        }
      )
    }

    const cloud_save_enabled = Boolean(CloudSaveFolder)
    const saveFolder = cloud_save_enabled ? CloudSaveFolder.value : ''
    const installFolder = FolderName ? FolderName.value : ''
    const gameBox = keyImages.filter(
      ({ type }: KeyImage) => type === 'DieselGameBox'
    )[0]
    const gameBoxTall = keyImages.filter(
      ({ type }: KeyImage) => type === 'DieselGameBoxTall'
    )[0]
    const logo = keyImages.filter(
      ({ type }: KeyImage) => type === 'DieselGameBoxLogo'
    )[0]

    const fallBackImage =
      'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg'

    const art_cover = gameBox ? gameBox.url : null
    const art_logo = logo ? logo.url : null
    const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage

    const installedJSON = `${legendaryConfigPath}/installed.json`
    const installedGames: RawGameJSON[] = Object.values(
      statAsync(installedJSON)
        .then(() => JSON.parse(readFileSync(installedJSON, 'utf-8')))
        .catch(() => [])
    )

    const info = installedGames.find((game) => game.app_name === app_name)

    const {
      executable = null,
      version = null,
      install_size = null,
      install_path = null,
      is_dlc = dlcs.indexOf(app_name) >= 0
    } = (info === undefined ? {} : info) as InstalledInfo

    const convertedSize =
      install_size && prettyBytes(Number(install_size))

    this.library.set(app_name, {
      app_name,
      art_cover: art_cover || art_square,
      art_logo,
      art_square: art_square || art_cover,
      cloud_save_enabled,
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
      is_installed: info !== undefined,
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
          const app_name =fileName.split('.')[0]
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

export { Library }
