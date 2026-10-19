import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'graceful-fs'
import { GameInfo } from 'common/types'
import { basename, dirname, extname, isAbsolute, join } from 'path'
import { fileURLToPath } from 'url'
import { libraryManagerMap } from '../storeManagers'
import { downloadFile } from 'backend/utils'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import { heroicIconFolder as iconsFolder } from 'backend/constants/paths'
import { isMac } from 'backend/constants/environment'
import { logError, LogPrefix } from 'backend/logger'

function createImage(
  buffer: Buffer,
  outputFilePath: string
): string | undefined {
  try {
    writeFileSync(outputFilePath, buffer, {
      encoding: 'ascii'
    })
  } catch (error) {
    return `${error}`
  }
  return
}

function downloadImage(
  imageURL: string,
  outputFilePath: string
): string | undefined {
  try {
    downloadFile({
      url: imageURL,
      dest: outputFilePath,
      abortSignal: createAbortController(imageURL).signal
    })
  } catch (error) {
    return `Donwloading of ${imageURL} failed with:\n${error}`
  }
  return
}

function removeImage(imagePath: string): string | undefined {
  try {
    unlinkSync(imagePath)
  } catch (error) {
    return `Removing of ${imagePath} failed with:\n${error}`
  }
  return
}

function checkImageExistsAlready(image: string): boolean {
  const extentions = ['.png', '.jpg']

  const imageName = basename(image).replace(extname(image), '')
  const dirName = dirname(image)

  const found = extentions.find((extention) => {
    return existsSync(join(dirName, imageName + extention))
  })

  return found !== undefined ? true : false
}

// Sideloaded games store picked art as `file://` + the unencoded path, and
// their default art lives inside app.asar, which only Electron's fs can read
function localImagePath(image: string): string | undefined {
  if (!image.startsWith('file://')) {
    return isAbsolute(image) ? image : undefined
  }
  const path = image.slice('file://'.length)
  if (existsSync(path)) return path
  try {
    return fileURLToPath(image)
  } catch {
    return undefined
  }
}

async function cacheImage(image: string, dest: string) {
  // Remembers which art the cached file came from, so edited art replaces it
  const sourceFile = `${dest}.source`
  if (
    existsSync(dest) &&
    existsSync(sourceFile) &&
    readFileSync(sourceFile, 'utf-8') === image
  ) {
    return
  }

  try {
    const localPath = localImagePath(image)
    if (localPath) {
      writeFileSync(dest, readFileSync(localPath))
    } else {
      const url = image.replaceAll(' ', '%20')
      await downloadFile({
        url,
        dest,
        abortSignal: createAbortController(url).signal
      })
      deleteAbortController(url)
    }
    writeFileSync(sourceFile, image)
  } catch (error) {
    logError([`Couldn't get the icon from ${image}:`, error], LogPrefix.Backend)
  }
}

async function getIcon(appName: string, gameInfo: GameInfo) {
  if (!existsSync(iconsFolder)) {
    mkdirSync(iconsFolder)
  }

  // By default use vertical image - art_square in jpg format
  let image = gameInfo.art_square.replace('{ext}', 'jpg')
  let icon = `${iconsFolder}/${appName}.jpg`

  if (gameInfo.runner === 'gog') {
    const icoPath = join(
      gameInfo.install.install_path!,
      `goggame-${appName}.ico`
    )
    const linuxNativePath = join(
      gameInfo.install.install_path!,
      'support',
      'icon.png'
    )
    // Electron can't decode .ico files on macOS
    if (!isMac && existsSync(icoPath)) {
      return icoPath
    } else if (existsSync(linuxNativePath)) {
      return linuxNativePath
    }
    const productApiData = await libraryManagerMap['gog'].getProductApi(appName)
    if (productApiData && productApiData.data.images?.icon) {
      image = 'https:' + productApiData.data.images?.icon
      icon = `${iconsFolder}/${appName}.png` // Allow transparency
    }
  }

  await cacheImage(image, icon)
  return icon
}

export {
  createImage,
  downloadImage,
  removeImage,
  checkImageExistsAlready,
  getIcon
}
