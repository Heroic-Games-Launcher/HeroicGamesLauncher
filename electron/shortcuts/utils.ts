import { existsSync, mkdirSync } from 'graceful-fs'
import { execAsync } from '../utils'
import { GOGLibrary } from '../gog/library'
import { heroicIconFolder } from '../constants'
import { GameInfo } from '../types'

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
      await execAsync(`curl '${image}' --output ${icon}`)
    }
    return icon
  } else if (gameInfo.runner === 'gog') {
    const apiData = await GOGLibrary.get().getGamesData(appName)
    let iconUrl = apiData?._links?.icon.href
    iconUrl = iconUrl.replace('{ext}', 'png')
    const icon = `${heroicIconFolder}/${appName}.png`
    if (!existsSync(icon)) {
      await execAsync(`curl '${iconUrl}' --output ${icon}`)
    }
    return icon
  }
}

export { getIcon }
