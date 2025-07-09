import { crc32 } from 'crc'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { GameInfo } from 'common/types'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import {
  checkImageExistsAlready,
  createImage,
  downloadImage,
  removeImage
} from '../utils'
import {
  transparentSteamLogoHex,
  logoArtSufix,
  backGroundArtSufix,
  coverArtSufix,
  pictureExt,
  steamDBBaseURL
} from './constants'
import { nativeImage } from 'electron'
import { getMainWindow } from 'backend/main_window'

const generateImage = async (
  src: string,
  width: number,
  height: number
): Promise<string> => {
  const window = getMainWindow()

  if (!window) {
    return Promise.resolve('')
  }

  return window.webContents.executeJavaScript(
    `window.imageData("${src}", ${width}, ${height})`
  )
}

async function prepareImagesForSteam(props: {
  steamUserConfigDir: string
  appID: {
    bigPictureAppID: string
    otherGridAppID: string
  }
  gameInfo: GameInfo
  steamID: string | undefined
}) {
  const gridFolder = join(props.steamUserConfigDir, 'grid')
  const coverArt = join(gridFolder, props.appID.otherGridAppID + coverArtSufix)
  const headerArt = join(gridFolder, props.appID.otherGridAppID + pictureExt)
  const backGroundArt = join(
    gridFolder,
    props.appID.otherGridAppID + backGroundArtSufix
  )
  const logoArt = join(gridFolder, props.appID.otherGridAppID + logoArtSufix)

  if (!existsSync(gridFolder)) {
    mkdirSync(gridFolder)
  }

  logInfo(
    `Prepare Steam images for ${props.gameInfo.title}`,
    LogPrefix.Shortcuts
  )

  let bkgDataUrl = ''
  if (!props.steamID) {
    await generateImage(props.gameInfo.art_cover, 1920, 620)
      .then((img) => (bkgDataUrl = img))
      .catch((error) =>
        errors.push(`Failed to generate background image with ${error}`)
      )
  }

  const errors: string[] = []
  const images = new Map<string, string>([
    [
      coverArt,
      props.steamID
        ? `${steamDBBaseURL}/${props.steamID}/library_600x900_2x.jpg`
        : props.gameInfo.art_square
    ],
    [
      headerArt,
      props.steamID
        ? `${steamDBBaseURL}/${props.steamID}/header.jpg`
        : props.gameInfo.art_cover
    ],
    [
      backGroundArt,
      props.steamID
        ? `${steamDBBaseURL}/${props.steamID}/library_hero.jpg`
        : bkgDataUrl
    ]
  ])

  // if no steam logo or logo art is provided we add a 1x1 transparent png
  // to get rid of game title in steam
  if (props.steamID) {
    images.set(logoArt, `${steamDBBaseURL}/${props.steamID}/logo.png`)
  } else if ('art_logo' in props.gameInfo && props.gameInfo.art_logo) {
    images.set(logoArt, props.gameInfo.art_logo)
  } else {
    const error = createImage(
      Buffer.from(transparentSteamLogoHex, 'hex'),
      logoArt
    )
    if (error) {
      errors.push(error)
    }
  }

  for (const [key, imgUrl] of images) {
    if (!checkImageExistsAlready(key) && imgUrl) {
      if (imgUrl.startsWith('http')) {
        const error = downloadImage(imgUrl, key)
        if (error) {
          errors.push(error)
        }
      } else {
        const image = nativeImage.createFromDataURL(imgUrl).toJPEG(90)

        const error = createImage(image, key)

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
