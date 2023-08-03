import { logError } from 'backend/logger'
import { getGameInfo as getSteamLibraryGameInfo } from './library'
import { GameInfo } from 'common/types'
import { existsSync } from 'graceful-fs'

export function getGameInfo(appName: string): GameInfo {
  const info = getSteamLibraryGameInfo(appName)
  if (!info) {
    logError([
      'Could not get game info for',
      `${appName},`,
      'returning empty object. Something is probably gonna go wrong soon'
    ])
    return {
      app_name: '',
      runner: 'steam',
      art_cover: '',
      art_square: '',
      install: {},
      is_installed: false,
      title: '',
      canRunOffline: false
    }
  }
  return info
}

export function isGameAvailable(appName: string) {
  const info = getGameInfo(appName)
  if (info && info.is_installed) {
    if (info.install.install_path && existsSync(info.install.install_path)) {
      return true
    } else {
      return false
    }
  }
  return false
}
