import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'graceful-fs'
import { GameInfo } from 'common/types'
import { createHash } from 'crypto'
import { basename, dirname, extname, join } from 'path'
import { libraryManagerMap } from '../storeManagers'
import { downloadFile } from 'backend/utils'
import { createAbortController } from 'backend/utils/aborthandler/aborthandler'
import { heroicIconFolder as iconsFolder } from 'backend/constants/paths'
import { padToSquare } from 'backend/utils/image'

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

async function getIcon(appName: string, gameInfo: GameInfo) {
  if (!existsSync(iconsFolder)) {
    mkdirSync(iconsFolder)
  }

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
    if (existsSync(icoPath)) {
      return icoPath
    } else if (existsSync(linuxNativePath)) {
      return linuxNativePath
    }
  }

  // Prefer a dedicated icon image over the (usually portrait) cover art,
  // since the cover gets stretched/cropped by most desktop environments
  // when used as an app icon.
  const artIcon = gameInfo.overrides?.art_icon || gameInfo.art_icon
  let image = artIcon || gameInfo.overrides?.art_square || gameInfo.art_square

  if (!artIcon && gameInfo.runner === 'gog') {
    const productApiData = await libraryManagerMap['gog'].getProductApi(appName)
    if (productApiData && productApiData.data.images?.icon) {
      image = 'https:' + productApiData.data.images?.icon
    }
  }

  image = image.replaceAll(' ', '%20').replace('{ext}', 'jpg')
  // Key the cached file off the source so switching between cover art and a
  // dedicated icon (or picking a new one) doesn't keep serving a stale icon.
  const imageHash = createHash('sha1').update(image).digest('hex').slice(0, 8)
  const squareIcon = `${iconsFolder}/${appName}-${imageHash}-square.png`

  if (!existsSync(squareIcon)) {
    const rawIcon = `${iconsFolder}/${appName}-raw${extname(image) || '.jpg'}`
    if (image.startsWith('file://')) {
      writeFileSync(rawIcon, readFileSync(image.replace('file://', '')))
    } else {
      await downloadFile({
        url: image,
        dest: rawIcon,
        abortSignal: createAbortController(image).signal
      })
    }
    writeFileSync(squareIcon, padToSquare(readFileSync(rawIcon)))
    unlinkSync(rawIcon)
  }

  return squareIcon
}

export {
  createImage,
  downloadImage,
  removeImage,
  checkImageExistsAlready,
  getIcon
}
