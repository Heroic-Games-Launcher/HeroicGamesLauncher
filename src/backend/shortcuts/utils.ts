import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { GameInfo } from 'common/types'
import { basename, dirname, extname, join } from 'path'
import { getProductApi } from 'backend/storeManagers/gog/library'
import { downloadFile } from 'backend/utils'
import { createAbortController } from 'backend/utils/aborthandler/aborthandler'
import { heroicIconFolder as iconsFolder } from 'backend/constants/paths'

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

  // By default use vertical image - art_square in jpg format
  let image = gameInfo.art_square.replaceAll(' ', '%20').replace('{ext}', 'jpg')
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
    if (existsSync(icoPath)) {
      return icoPath
    } else if (existsSync(linuxNativePath)) {
      return linuxNativePath
    }
    const productApiData = await getProductApi(appName)
    if (productApiData && productApiData.data.images?.icon) {
      image = 'https:' + productApiData.data.images?.icon
      icon = `${iconsFolder}/${appName}.png` // Allow transparency
    }
  }

  if (!checkImageExistsAlready(icon)) {
    downloadImage(image, icon)
  }
  return icon
}

export {
  createImage,
  downloadImage,
  removeImage,
  checkImageExistsAlready,
  getIcon
}
