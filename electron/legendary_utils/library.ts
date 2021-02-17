/* eslint-disable @typescript-eslint/ban-ts-comment */
import { writeFileSync } from 'graceful-fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, existsSync, stat } from 'graceful-fs'
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

export async function getLegendaryGames() {
  const { stdout, stderr } = await execAsync(
    `${legendaryBin} list-games --json`
  )
  if (stdout) {
    const results = JSON.parse(stdout)
    // NEED DOUBLE CHECK IF SOMETHINGS INSIDE IS NEEDED OR ADD MORE STUFF IT REDUCE SIZE OF THE FINAL FILE
    // There is maybe a better way to do that tried with filter but still not work
    results.map((res: any) => {
      delete res.asset_info
      delete res.metadata.creationDate
      delete res.metadata.developerId
      delete res.metadata.dlcItemList
      delete res.metadata.endOfSupport
      delete res.metadata.entitlementName
      delete res.metadata.entitlementType
      delete res.metadata.lastModifiedDate
      delete res.metadata.releaseInfo
      res.metadata.keyImages.map((k: any) => {
        delete k.height
        delete k.md5
        delete k.size
        delete k.uploadedDate
        delete k.width
      })
    })
    const json = JSON.stringify(results)
    return writeFileSync(`${heroicFolder}library.json`, json)
  } else if (stderr) {
    // return a file to avoid infinite loop
    return writeFileSync(
      `${heroicFolder}library.json`,
      '{"result":"noGamesFound"}'
    )
  } else {
    // return a file to avoid infinite loop
    return writeFileSync(
      `${heroicFolder}library.json`,
      '{"result":"noGamesFound"}'
    )
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
    const library = existsSync(`${heroicFolder}library.json`)
    const fallBackImage =
      'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg'

    if (library) {
      return JSON.parse(readFileSync(`${heroicFolder}library.json`, 'utf-8'))
        .map(
          (c: {
            metadata: {
              description: any
              keyImages: any
              title: any
              developer: any
              customAttributes: { CloudSaveFolder: any; FolderName: any }
            }
            app_name: string
            app_version: string
            dlcs: string[]
          }) => {
            const {
              description,
              keyImages,
              title,
              developer,
              customAttributes: { CloudSaveFolder, FolderName },
            } = c.metadata
            const app_name = c.app_name
            const dlcs = c.dlcs
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

            const art_cover = gameBox
              ? gameBox.url.replaceAll(' ', '%20')
              : fallBackImage
            const art_logo = logo ? logo.url.replaceAll(' ', '%20') : null
            const art_square = gameBoxTall
              ? gameBoxTall.url.replaceAll(' ', '%20')
              : fallBackImage

            const installedGames: Game[] = Object.values(files.installed)

            const isInstalled = Boolean(
              installedGames.filter((game) => game.app_name === app_name).length
            )
            const info = isInstalled
              ? installedGames.filter((game) => game.app_name === app_name)[0]
              : {}

            const {
              executable = null,
              version = c.app_version,
              install_size = null,
              install_path = null,
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
              art_cover,
              art_square,
              art_logo,
              dlcs,
            }
          }
        )
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
