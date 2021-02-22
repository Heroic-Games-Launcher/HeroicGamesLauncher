/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, existsSync, stat, readdirSync, writeFileSync, unlinkSync } from 'graceful-fs'
// @ts-ignore
import byteSize from 'byte-size'

import {
  heroicConfigPath,
  heroicFolder,
  isLoggedIn,
  legendaryBin,
  legendaryConfigPath,
  userInfo,
  writeDefaultconfig,
} from '../utils'
import { Game, InstalledInfo, KeyImage } from '../types'

const execAsync = promisify(exec)
const statAsync = promisify(stat)

export async function getLegendaryGames(): Promise<void> {
  await execAsync(`${legendaryBin} list-games --json >> ${heroicFolder}tmplibrary.json`, {maxBuffer: Infinity})
  const out = readFileSync(`${heroicFolder}tmplibrary.json`)
  unlinkSync(`${heroicFolder}tmplibrary.json`)
  const stdoutjson = JSON.parse(out.toString())
  const result = []
  for (let index = 0; index < stdoutjson.length; index++) {
    const game = {
      "app_name": stdoutjson[index].app_name,
      "app_version": stdoutjson[index].app_version,
      "dlcs": stdoutjson[index].dlcs,
      "metadata": {
        "description": stdoutjson[index].metadata.description,
        "keyImages": stdoutjson[index].metadata.keyImages.map((k: any) => {
          [k.url,k.type]
        }),
        "title": stdoutjson[index].metadata.title,
        "developer": stdoutjson[index].metadata.developer,
        "customAttributes": stdoutjson[index].metadata.customAttributes
      }
    }
    result.push(game)
  }
  if (result.length > 0) {
    return writeFileSync(`${heroicFolder}library.json`, JSON.stringify(result))
  }
  else {
    return writeFileSync(`${heroicFolder}library.json`, '{"result":"noGamesFound"}')
  }
}

const installed = `${legendaryConfigPath}/installed.json`

export async function getLegendaryConfig(file: string) {
  const loggedIn = isLoggedIn()

  if (!isLoggedIn) {
    return { user: { displayName: null }, library: [] }
  }

  const files: any = {
    user: loggedIn
      ? JSON.parse(readFileSync(userInfo, 'utf8'))
      : { displayName: null },
    library: `${legendaryConfigPath}/metadata/`,
    config: heroicConfigPath,
    installed: await statAsync(installed)
      .then(() => JSON.parse(readFileSync(installed, 'utf-8')))
      .catch(() => []),
  }

  if (file === 'user') {
    if (loggedIn) {
      await writeDefaultconfig()
      return files[file].displayName
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
        .map(({ app_name, metadata }) => {
          const {
            description,
            keyImages,
            title,
            developer,
            customAttributes: { CloudSaveFolder, FolderName },
          } = metadata
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

          const {
            executable = null,
            version = null,
            install_size = null,
            install_path = null,
            is_dlc = null,
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
          }
        })
        .sort((a: { title: string }, b: { title: string }) => {
          const gameA = a.title.toUpperCase()
          const gameB = b.title.toUpperCase()
          return gameA < gameB ? -1 : 1
        })
    }
    return []
  }
  return files[file]
}
