import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { GOGLibrary } from '../gog/library'
import { heroicIconFolder } from '../constants'
import { GameInfo } from '../types'
import { spawnSync } from 'child_process'
import { basename, dirname, extname, join } from 'path'

function createImage(buffer: Buffer, outputFilePath: string): string {
  try {
    writeFileSync(outputFilePath, buffer, {
      encoding: 'ascii'
    })
  } catch (error) {
    return `${error}`
  }
  return undefined
}

function downloadImage(imageURL: string, outputFilePath: string): string {
  try {
    spawnSync('curl', ['-L', imageURL, '-o', outputFilePath])
  } catch (error) {
    return `Donwloading of ${imageURL} failed with:\n${error}`
  }
  return undefined
}

function removeImage(imagePath: string): string {
  try {
    unlinkSync(imagePath)
  } catch (error) {
    return `Removing of ${imagePath} failed with:\n${error}`
  }
  return undefined
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
  if (!existsSync(heroicIconFolder)) {
    mkdirSync(heroicIconFolder)
  }

  if (gameInfo.runner === 'legendary') {
    const image = gameInfo.art_square.replaceAll(' ', '%20')
    let ext = image.split('.').reverse()[0]
    if (ext !== 'jpg' && ext !== 'png') {
      ext = 'jpg'
    }
    const icon = `${heroicIconFolder}/${appName}.${ext}`
    if (!checkImageExistsAlready(icon)) {
      downloadImage(image, icon)
    }
    return icon
  } else if (gameInfo.runner === 'gog') {
    const apiData = await GOGLibrary.get().getGamesData(appName)
    let iconUrl = apiData?._links?.icon.href
    iconUrl = iconUrl.replace('{ext}', 'png')
    const icon = `${heroicIconFolder}/${appName}.png`
    if (!checkImageExistsAlready(icon)) {
      downloadImage(iconUrl, icon)
    }
    return icon
  }
}

export {
  createImage,
  downloadImage,
  removeImage,
  checkImageExistsAlready,
  getIcon
}
