import { crc32 } from 'crc'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { GameInfo } from '../../types'
import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
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
  pictureExt
} from './constants'
import { nativeImage } from 'electron'
import SGDB from 'steamgriddb'

async function prepareImagesForSteam(props: {
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

  // check steamgriddb
  const steamPictures = await getSteamGridDBImages(props.gameInfo.title)

  interface ImageProps {
    url: string
    width?: number
    height?: number
  }

  const errors: string[] = []
  const images = new Map<string, ImageProps>([
    [coverArt, { url: steamPictures.coverArt ?? props.gameInfo.art_square }],
    [headerArt, { url: steamPictures.headerArt ?? props.gameInfo.art_cover }],
    [
      backGroundArt,
      {
        url: steamPictures.backGroundArt ?? props.gameInfo.art_cover,
        width: 1920,
        height: 620
      }
    ],
    [
      bigPictureArt,
      {
        url: steamPictures.bigPictureArt ?? props.gameInfo.art_cover,
        width: 920,
        height: 430
      }
    ]
  ])

  // if no logo art is provided we add a 1x1 transparent png
  // to get rid of game title in steam
  if (steamPictures.logoArt || props.gameInfo.art_logo) {
    images.set(logoArt, {
      url: steamPictures.logoArt ?? props.gameInfo.art_logo
    })
  } else {
    const error = createImage(
      Buffer.from(transparentSteamLogoHex, 'hex'),
      logoArt
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

interface SteamGridDBImageUrls {
  coverArt: string
  headerArt: string
  backGroundArt: string
  bigPictureArt: string
  logoArt: string
}

async function getSteamGridDBImages(
  title: string
): Promise<SteamGridDBImageUrls> {
  // need a steamgriddb API key of steam account
  // https://www.steamgriddb.com/profile/preferences/api
  const steamGridDB = new SGDB('')

  const steamGridDBImageUrls = {} as SteamGridDBImageUrls
  let gameFound = undefined
  await steamGridDB
    .searchGame(title)
    .then((games: []) => {
      gameFound = games.find((game) => {
        if ('types' in game) {
          const types = game['types'] as string[]
          const typeFound = types.find((type) => type === 'steam')
          return game['name'] === title && game['id'] && typeFound
        }
      })
    })
    .catch((error) =>
      logWarning(
        [`SteamGridDB failed to find game with:`, `${error}`].join('\n'),
        LogPrefix.Shortcuts
      )
    )

  if (gameFound) {
    // get coverArt, headerArt and bigpictureArt
    await steamGridDB
      .getGrids({
        id: gameFound['id'],
        type: 'game',
        styles: ['alternate', 'white_logo']
      })
      .then((grids: []) => {
        grids.some((grid) => {
          if (
            grid['width'] === 600 &&
            grid['height'] === 900 &&
            !steamGridDBImageUrls.coverArt
          ) {
            steamGridDBImageUrls.coverArt = grid['thumb']
          } else if (
            grid['width'] === 920 &&
            grid['height'] === 430 &&
            !steamGridDBImageUrls.headerArt
          ) {
            steamGridDBImageUrls.headerArt = grid['thumb']
            steamGridDBImageUrls.bigPictureArt = grid['thumb']
          }

          return steamGridDBImageUrls.headerArt && steamGridDBImageUrls.coverArt
        })
      })
      .catch((error) =>
        logWarning(
          [`SteamGridDB failed to find grid images with:`, `${error}`].join(
            '\n'
          ),
          LogPrefix.Shortcuts
        )
      )

    // get backgroundArt
    await steamGridDB
      .getHeroes({
        id: gameFound['id'],
        type: 'game',
        styles: ['alternate']
      })
      .then((grids: []) => {
        grids.some((grid) => {
          if (
            grid['width'] === 1920 &&
            grid['height'] === 620 &&
            !steamGridDBImageUrls.backGroundArt
          ) {
            steamGridDBImageUrls.backGroundArt = grid['thumb']
            return true
          }
        })
      })
      .catch((error) =>
        logWarning(
          [`SteamGridDB failed to find heroes images with:`, `${error}`].join(
            '\n'
          ),
          LogPrefix.Shortcuts
        )
      )

    // get logo
    await steamGridDB
      .getLogos({
        id: gameFound['id'],
        type: 'game',
        styles: ['official']
      })
      .then((grids: []) => {
        grids.some((grid) => {
          if (!steamGridDBImageUrls.logoArt) {
            steamGridDBImageUrls.logoArt = grid['thumb']
            return true
          }
        })
      })
      .catch((error) =>
        logWarning(
          [`SteamGridDB failed to find heroes images with:`, `${error}`].join(
            '\n'
          ),
          LogPrefix.Shortcuts
        )
      )
  }

  return steamGridDBImageUrls
}

export {
  prepareImagesForSteam,
  generateAppId,
  generateShortAppId,
  generateShortcutId,
  removeImagesFromSteam
}
