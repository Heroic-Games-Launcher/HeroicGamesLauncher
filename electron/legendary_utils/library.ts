import { existsSync, readFileSync, readdirSync } from 'graceful-fs'
import prettyBytes from 'pretty-bytes'

import { GameInfo, InstalledInfo, KeyImage, RawGameJSON } from '../types'
import { execAsync, statAsync } from '../utils'
import { legendaryBin, legendaryConfigPath } from '../constants'


class Library {
  private static globalInstance: Library = null

  private library: Map<string, GameInfo>

  private constructor(lazy_load: boolean) {
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

          const art_cover = gameBox ? gameBox.url : null
          const art_logo = logo ? logo.url : null
          const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage

          const installedJSON = `${legendaryConfigPath}/installed.json`
          const installedGames: RawGameJSON[] = Object.values(
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
            cloud_save_enabled,
            developer,
            extra: {
              description,
              shortDescription
            },
            folder_name: installFolder,
            install: ({
              executable,
              install_path,
              install_size: convertedSize,
              is_dlc,
              version
            }),
            is_installed: isInstalled,
            namespace,
            save_folder: saveFolder,
            title
          } as GameInfo)
        })
    }
  }
}

export { Library }
