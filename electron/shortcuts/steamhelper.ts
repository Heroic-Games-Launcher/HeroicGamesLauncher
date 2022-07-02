import { crc32 } from 'crc'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { GameInfo } from '../types'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import {
  checkImageExistsAlready,
  createImage,
  downloadImage,
  removeImage
} from './utils'
import { transparentSteamLogoHex } from '../constants'
import { nativeImage } from 'electron'

const pictureExt = '.jpg'
const coverArtSufix = 'p' + pictureExt
const backGroundArtSufix = '_hero' + pictureExt
const logoArtSufix = '_logo' + pictureExt

function prepareImagesForSteam(props: {
  steamUserConfigDir: string
  appID: {
    bigPictureAppID: string
    otherGridAppID: string
  }
  gameInfo: GameInfo
}) {
  const gridFolder = join(props.steamUserConfigDir, 'grid')
  const coverArt = join(gridFolder, props.appID.otherGridAppID + coverArtSufix)
  const headerArt = join(gridFolder, props.appID.otherGridAppID + pictureExt)
  const backGroundArt = join(
    gridFolder,
    props.appID.otherGridAppID + backGroundArtSufix
  )
  const bigPictureArt = join(
    gridFolder,
    props.appID.bigPictureAppID + pictureExt
  )
  const logoArt = join(gridFolder, props.appID.otherGridAppID + logoArtSufix)

  if (!existsSync(gridFolder)) {
    mkdirSync(gridFolder)
  }

  logInfo(
    `Prepare Steam images for ${props.gameInfo.title}`,
    LogPrefix.Shortcuts
  )

  interface ImageProps {
    url: string
    width?: number
    height?: number
  }

  const errors: string[] = []
  const images = new Map<string, ImageProps>([
    [coverArt, { url: props.gameInfo.art_square }],
    [headerArt, { url: props.gameInfo.art_cover }],
    [
      backGroundArt,
      { url: props.gameInfo.art_cover, width: 1920, height: 620 }
    ],
    [bigPictureArt, { url: props.gameInfo.art_cover, width: 460, height: 215 }]
  ])

  // if no logo art is provided we add a 1x1 transparent png
  // to get rid of game title in steam
  if (props.gameInfo.art_logo) {
    images.set(logoArt, { url: props.gameInfo.art_logo })
  } else {
    const error = createImage(
      Buffer.from(transparentSteamLogoHex, 'hex'),
      logoArt.replace(pictureExt, '.png')
    )
    if (error) {
      errors.push(error)
    }
  }

  for (const [key, value] of images) {
    if (!checkImageExistsAlready(key) && value.url) {
      let error = downloadImage(value.url, key)
      if (error) {
        errors.push(error)
      }

      if (value.width && value.height) {
        const image = nativeImage
          .createFromPath(key)
          .resize({ width: value.width, height: value.height })
          .toJPEG(90)

        error = createImage(image, key)

        if (error) {
          errors.push(error)
        }
      }
    }
  }

  if (errors.length > 0) {
    logError(
      [
        `Preparing Steam images for ${props.gameInfo.title} failed with:\n`,
        errors.join('\n')
      ],
      LogPrefix.Shortcuts
    )
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
  const coverArt = join(gridFolder, props.appID.otherGridAppID + coverArtSufix)
  const headerArt = join(gridFolder, props.appID.otherGridAppID + pictureExt)
  const backGroundArt = join(
    gridFolder,
    props.appID.otherGridAppID + backGroundArtSufix
  )
  const bigPictureArt = join(
    gridFolder,
    props.appID.bigPictureAppID + pictureExt
  )
  const logoArt = join(gridFolder, props.appID.otherGridAppID + logoArtSufix)

  if (!existsSync(gridFolder)) {
    return
  }

  logInfo(
    `Remove Steam images for ${props.gameInfo.title}`,
    LogPrefix.Shortcuts
  )

  const errors: string[] = []
  const images = [coverArt, headerArt, backGroundArt, bigPictureArt, logoArt]

  images.forEach((image) => {
    if (checkImageExistsAlready(image)) {
      const error = removeImage(image)
      if (error) {
        errors.push(error)
      }
    }
  })

  if (errors.length > 0) {
    logError(
      [
        `Removing Steam images for ${props.gameInfo.title} failed with:\n`,
        errors.join('\n')
      ],
      LogPrefix.Shortcuts
    )
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
