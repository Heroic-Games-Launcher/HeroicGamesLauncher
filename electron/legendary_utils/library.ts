/* eslint-disable @typescript-eslint/ban-ts-comment */
import { existsSync, readFileSync, readdirSync, stat } from 'graceful-fs'
import { promisify } from 'util'
// @ts-ignore
import byteSize from 'byte-size'

import { Game, InstalledInfo, KeyImage, UserInfo } from '../types'
import {
  getUserInfo,
  heroicConfigPath,
  isLoggedIn,
  legendaryConfigPath,
  writeDefaultconfig
} from '../utils'

const statAsync = promisify(stat)
const dlcs: string[] = []

const installed = `${legendaryConfigPath}/installed.json`

export async function getLegendaryConfig(file: string): Promise<unknown> {
  const loggedIn = isLoggedIn()

  if (!isLoggedIn) {
    return { library: [], user: { displayName: null } }
  }

  const files: {
    config: string,
    installed: Game[],
    library: string,
    user: UserInfo
  } = {
    config: heroicConfigPath,
    installed: await statAsync(installed)
      .then(() => JSON.parse(readFileSync(installed, 'utf-8')))
      .catch(() => []),
    library: `${legendaryConfigPath}/metadata/`,
    user: getUserInfo()
  }

  if (file === 'user') {
    if (loggedIn) {
      await writeDefaultconfig()
      return files.user.displayName
    }
    return null
  }

  if (file === 'library') {
    const fallBackImage =
      'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg'

    if (existsSync(files.library)) {
      return readdirSync(files.library)
        .map((file) => `${files.library}/${file}`)
        .map((file) => JSON.parse(readFileSync(file, 'utf-8')))
        .map(({ app_name, metadata, asset_info }) => {
          const {
            description,
            keyImages,
            title,
            developer,
            dlcItemList,
            customAttributes: { CloudSaveFolder, FolderName }
          } = metadata

          const {namespace} = asset_info

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

          const installedGames: Game[] = Object.values(files.installed)

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
            install_size &&
            `${byteSize(install_size).value}${byteSize(install_size).unit}`

          return {
            app_name,
            art_cover: art_cover || art_square,
            art_logo,
            art_square: art_square || art_cover,
            cloudSaveEnabled,
            description,
            developer,
            executable,
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
          }
        })
        .sort((a: { title: string }, b: { title: string }) => {
          const gameA = a.title.toUpperCase()
          const gameB = b.title.toUpperCase()
          return gameA < gameB ? -1 : 1
        })
    }
    return { library: [], user: null }
  }
}
