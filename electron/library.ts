import { exec } from 'child_process'
import { existsSync, readFileSync, readdirSync, stat } from 'graceful-fs'
import { promisify } from 'util'
import prettyBytes from 'pretty-bytes'

import { Game, InstalledInfo, KeyImage } from './types'
import { GameInfo } from './game'
import { legendaryBin, legendaryConfigPath } from './constants'

const execAsync = promisify(exec)
const statAsync = promisify(stat)

type LoadState = 'loaded' | 'loading' | 'not loaded'

class Library {
  private load_state: LoadState
  private static globalInstance: Library = null

  private library: Map<string, GameInfo>

  private constructor(lazy_load: boolean) {
    this.load_state = 'not loaded'
    if (lazy_load) {
      this.load()
    }
  }

  public static get(lazy_load = true) {
    if (this.globalInstance === null) {
      Library.globalInstance = new Library(lazy_load)
    }
    return this.globalInstance
  }

  public async getGames() {
    return Array.from(this.library.values()).sort(
      (a: { title: string }, b: { title: string }) => {
        const gameA = a.title.toUpperCase()
        const gameB = b.title.toUpperCase()
        return gameA < gameB ? -1 : 1
      }
    )
  }

  public async getGameInfo(app_name: string) {
    return this.library.get(app_name) || null
  }

  public async listUpdateableGames() {
    const command = `${legendaryBin} list-installed --check-updates --tsv | grep True | awk '{print $1}'`
    const { stdout } = await execAsync(command)
    const result = stdout.split('\n')
    return result
  }

  private async load() {
    if (this.load_state == 'loading') {
      // there is a thread already loading stuff, wait for it to finish.
    }
    this.load_state = 'loading'

    const libraryPath = `${legendaryConfigPath}/metadata/`
    const fallBackImage =
      'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg'

    if (existsSync(libraryPath)) {
      return readdirSync(libraryPath)
        .map((file) => `${libraryPath}/${file}`)
        .map((file) => JSON.parse(readFileSync(file, 'utf-8')))
        .forEach(({ app_name, metadata, asset_info }) => {
          const {
            description,
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

          const cloudSaveEnabled = Boolean(CloudSaveFolder)
          const saveFolder = cloudSaveEnabled ? CloudSaveFolder.value : ''
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

          const art_cover = gameBox ? gameBox.url : null
          const art_logo = logo ? logo.url : null
          const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage

          const installedJSON = `${legendaryConfigPath}/installed.json`
          const installedGames: Game[] = Object.values(
            statAsync(installedJSON)
              .then(() => JSON.parse(readFileSync(installedJSON, 'utf-8')))
              .catch(() => [])
          )

          const isInstalled = Boolean(
            installedGames.filter((game) => game.app_name === app_name).length
          )
          const info = isInstalled
            ? installedGames.filter((game) => game.app_name === app_name)[0]
            : {}

          const dlc = () => dlcs.some((dlc) => dlc === app_name)
          const {
            executable = null,
            version = null,
            install_size = null,
            install_path = null,
            is_dlc = dlc()
          } = info as InstalledInfo

          const convertedSize =
            install_size && prettyBytes(Number(install_size))

          this.library.set(app_name, {
            app_name,
            art_cover: art_cover || art_square,
            art_logo,
            art_square: art_square || art_cover,
            cloudSaveEnabled,
            description,
            developer,
            executable,
            extraInfo: [],
            folderName: installFolder,
            info,
            install_path,
            install_size: convertedSize,
            isInstalled,
            is_dlc,
            namespace,
            saveFolder,
            title,
            version
          } as GameInfo)
        })
    }
  }
}

export { Library }
