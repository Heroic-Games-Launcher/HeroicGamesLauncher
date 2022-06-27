import { existsSync, mkdirSync } from 'graceful-fs'
import { GOGLibrary } from '../gog/library'
import { heroicIconFolder } from '../constants'
import { GameInfo } from '../types'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { spawnSync } from 'child_process'

function downloadImage(imageURL: string, outputFilePath: string) {
  logInfo(`Donwload ${imageURL} to ${outputFilePath}`, LogPrefix.Shortcuts)
  try {
    spawnSync('curl', ['-L', imageURL, '-o', outputFilePath])
    logInfo(`Finished Donwloading of ${imageURL}.`, LogPrefix.Shortcuts)
  } catch (error) {
    logError(
      [`Donwloading of ${imageURL} failed with:\n`, `${error}`],
      LogPrefix.Shortcuts
    )
  }
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
    if (!existsSync(icon)) {
      downloadImage(image, icon)
    }
    return icon
  } else if (gameInfo.runner === 'gog') {
    const apiData = await GOGLibrary.get().getGamesData(appName)
    let iconUrl = apiData?._links?.icon.href
    iconUrl = iconUrl.replace('{ext}', 'png')
    const icon = `${heroicIconFolder}/${appName}.png`
    if (!existsSync(icon)) {
      downloadImage(iconUrl, icon)
    }
    return icon
  }
}

export { downloadImage, getIcon }
