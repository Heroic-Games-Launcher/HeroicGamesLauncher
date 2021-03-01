/* eslint-disable @typescript-eslint/ban-ts-comment */
import { promisify } from 'util'
import { readFileSync, existsSync, stat, readdirSync } from 'graceful-fs'
// @ts-ignore
import byteSize from 'byte-size'

import {
  getUserInfo,
  heroicConfigPath,
  isLoggedIn,
  legendaryConfigPath,
  writeDefaultconfig,
} from '../utils'
import { Game, InstalledInfo, KeyImage, UserInfo } from '../types'

const statAsync = promisify(stat)
const dlcs: string[] = []

const installed = `${legendaryConfigPath}/installed.json`

export async function getLegendaryConfig(file: string): Promise<unknown> {
  const loggedIn = isLoggedIn()

  if (!isLoggedIn) {
    return { user: { displayName: null }, library: [] }
  }

  const files: {
    user: UserInfo
    library: string
    config: string
    installed: Game[]
  } = {
    user: getUserInfo(),
    library: `${legendaryConfigPath}/metadata/`,
    config: heroicConfigPath,
    installed: await statAsync(installed)
      .then(() => JSON.parse(readFileSync(installed, 'utf-8')))
      .catch(() => []),
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
            customAttributes: { CloudSaveFolder, FolderName },
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
            is_dlc = dlc(),
          } = info as InstalledInfo

          const convertedSize =
            install_size &&
            `${byteSize(install_size).value}${byteSize(install_size).unit}`

          return {
            isInstalled,
            info,
            title,
            executable,
            version,
            install_size: convertedSize,
            install_path,
            app_name,
            developer,
            description,
            cloudSaveEnabled,
            saveFolder,
            folderName: installFolder,
            art_cover: art_cover || art_square,
            art_square: art_square || art_cover,
            art_logo,
            is_dlc,
            namespace
          }
        })
        .sort((a: { title: string }, b: { title: string }) => {
          const gameA = a.title.toUpperCase()
          const gameB = b.title.toUpperCase()
          return gameA < gameB ? -1 : 1
        })
    }
    return { user: null, library: [] }
  }
}
