import { crc32 } from 'crc'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { GameInfo } from '../types'
import { logInfo, LogPrefix, logWarning } from '../logger/logger'
import { downloadImage } from './utils'

function checkImageExistsAlready(folder: string, image: string): boolean {
  const extentions = ['.png', '.jpg']

  const found = extentions.find((extention) => {
    const imageName = image.split('.').slice(-1).join('.')
    return existsSync(join(folder, imageName + extention))
  })

  return found !== undefined ? true : false
}

function prepareImagesForSteam(props: {
  steamUserConfigDir: string
  appID: {
    bigPictureAppID: string
    otherGridAppID: string
  }
  gameInfo: GameInfo
}) {
  const gridFolder = join(props.steamUserConfigDir, 'grid')
  const backgroundart = props.appID.otherGridAppID + '_hero.jpg'
  const bigpictureart = props.appID.bigPictureAppID + '.jpg'
  const logoart = props.appID.otherGridAppID + '_logo.jpg'

  if (!existsSync(gridFolder)) {
    mkdirSync(gridFolder)
  }

  logInfo(
    `Prepare images for steam for ${props.gameInfo.title}`,
    LogPrefix.Shortcuts
  )

  switch (props.gameInfo.runner) {
    case 'legendary':
      if (
        !checkImageExistsAlready(gridFolder, backgroundart) &&
        props.gameInfo.art_cover
      ) {
        downloadImage(props.gameInfo.art_cover, join(gridFolder, backgroundart))
      }
      if (
        !checkImageExistsAlready(gridFolder, bigpictureart) &&
        props.gameInfo.art_cover
      ) {
        downloadImage(props.gameInfo.art_cover, join(gridFolder, bigpictureart))
      }
      if (
        !checkImageExistsAlready(gridFolder, logoart) &&
        props.gameInfo.art_logo
      ) {
        downloadImage(props.gameInfo.art_cover, join(gridFolder, logoart))
      }
      break
    case 'gog':
      if (
        !checkImageExistsAlready(gridFolder, backgroundart) &&
        props.gameInfo.art_cover
      ) {
        downloadImage(props.gameInfo.art_cover, join(gridFolder, backgroundart))
      }
      if (
        !checkImageExistsAlready(gridFolder, bigpictureart) &&
        props.gameInfo.art_cover
      ) {
        downloadImage(props.gameInfo.art_cover, join(gridFolder, bigpictureart))
      }
      break
    case 'heroic':
    default:
      logWarning('Runner does not provide image urls.', LogPrefix.Shortcuts)
      break
  }
}

// This function where copied over from steam-rom-manager
// https://github.com/SteamGridDB/steam-rom-manager/blob/master/src/lib/helpers/steam/generate-app-id.ts
// Special Thanks to there project

function generatePreliminaryId(exe: string, appname: string) {
  const key = exe + appname
  const top = BigInt(crc32(key)) | BigInt(0x80000000)
  return (BigInt(top) << BigInt(32)) | BigInt(0x02000000)
}

// Used for Big Picture Grids
function generateAppId(exe: string, appname: string) {
  return String(generatePreliminaryId(exe, appname))
}

// Used for all other Grids
function generateShortAppId(exe: string, appname: string) {
  return String(generatePreliminaryId(exe, appname) >> BigInt(32))
}

// Used as appid in shortcuts.vdf
function generateShortcutId(exe: string, appname: string) {
  return Number(
    (generatePreliminaryId(exe, appname) >> BigInt(32)) - BigInt(0x100000000)
  )
}

export {
  prepareImagesForSteam,
  generateAppId,
  generateShortAppId,
  generateShortcutId
}
