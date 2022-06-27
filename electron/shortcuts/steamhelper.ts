import { crc32 } from 'crc'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { GameInfo } from '../types'
import { logInfo, LogPrefix } from '../logger/logger'
import { checkImageExistsAlready, downloadImage, removeImage } from './utils'

const pictureExt = '.jpg'
const backGroundArtSufix = '_hero' + pictureExt
const logArtSufix = '_logo' + pictureExt

function prepareImagesForSteam(props: {
  steamUserConfigDir: string
  appID: {
    bigPictureAppID: string
    otherGridAppID: string
  }
  gameInfo: GameInfo
}) {
  const gridFolder = join(props.steamUserConfigDir, 'grid')
  const backGroundArt = join(
    gridFolder,
    props.appID.otherGridAppID + backGroundArtSufix
  )
  const bigPictureArt = join(
    gridFolder,
    props.appID.bigPictureAppID + pictureExt
  )
  const logoArt = join(gridFolder, props.appID.otherGridAppID + logArtSufix)

  if (!existsSync(gridFolder)) {
    mkdirSync(gridFolder)
  }

  logInfo(
    `Prepare Steam images for ${props.gameInfo.title}`,
    LogPrefix.Shortcuts
  )

  if (!checkImageExistsAlready(backGroundArt) && props.gameInfo.art_cover) {
    downloadImage(props.gameInfo.art_cover, backGroundArt)
  }
  if (!checkImageExistsAlready(bigPictureArt) && props.gameInfo.art_cover) {
    downloadImage(props.gameInfo.art_cover, bigPictureArt)
  }
  if (!checkImageExistsAlready(logoArt) && props.gameInfo.art_logo) {
    downloadImage(props.gameInfo.art_cover, logoArt)
  }
}

function removeImagesFromSteam(props: {
  steamUserConfigDir: string
  appID: {
    bigPictureAppID: string
    otherGridAppID: string
  }
  gameInfo: GameInfo
}) {
  const gridFolder = join(props.steamUserConfigDir, 'grid')
  const backGroundArt = join(
    gridFolder,
    props.appID.otherGridAppID + backGroundArtSufix
  )
  const bigPictureArt = join(
    gridFolder,
    props.appID.bigPictureAppID + pictureExt
  )
  const logoArt = join(gridFolder, props.appID.otherGridAppID + logArtSufix)

  if (!existsSync(gridFolder)) {
    return
  }

  logInfo(
    `Remove Steam images for ${props.gameInfo.title}`,
    LogPrefix.Shortcuts
  )

  if (checkImageExistsAlready(backGroundArt) && props.gameInfo.art_cover) {
    removeImage(backGroundArt)
  }
  if (checkImageExistsAlready(bigPictureArt) && props.gameInfo.art_cover) {
    removeImage(bigPictureArt)
  }
  if (checkImageExistsAlready(logoArt) && props.gameInfo.art_logo) {
    removeImage(logoArt)
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
  generateShortcutId,
  removeImagesFromSteam
}
