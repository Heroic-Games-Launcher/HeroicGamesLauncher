import { sendFrontendMessage } from './../main_window'
import { LogPrefix } from './../logger/logger'
import axios from 'axios'
import { cachedUbisoftInstallerPath } from 'backend/constants'
import { logWarning } from 'backend/logger/logger'
import { existsSync, createWriteStream } from 'graceful-fs'
// import { GameSettings } from 'common/types';
import { LegendaryGame } from './games'
import { Winetricks } from 'backend/tools'

const UBISOFT_INSTALLER_URL =
  'https://ubistatic3-a.akamaihd.net/orbit/launcher_installer/UbisoftConnectInstaller.exe'

export const setupUbisoftConnect = async (appName: string) => {
  const game = LegendaryGame.get(appName)
  if (!game) {
    return
  }

  const gameInfo = game.getGameInfo()
  if (!gameInfo) {
    return
  }

  // if not a ubisoft game, do nothing
  if (gameInfo.install.executable !== 'UplayLaunch.exe') {
    return
  }

  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: game.runner,
    status: 'ubisoft'
  })

  const promise1 = installUbisoftConnect(game)
  const promise2 = installArialFontInPrefix(game)
  // running these 2 tasks in parallel, they are independent
  await Promise.all([promise1, promise2])
}

const installUbisoftConnect = async (game: LegendaryGame) => {
  try {
    downloadIfNotCached(cachedUbisoftInstallerPath, UBISOFT_INSTALLER_URL)

    await game.runWineCommand({
      commandParts: [cachedUbisoftInstallerPath, '/S']
    })

    return true
  } catch {
    logWarning(
      'Failed to download UbisoftConnectInstaller.exe',
      LogPrefix.Backend
    )
    return false
  }
}

const installArialFontInPrefix = async (game: LegendaryGame) => {
  const settings = await game.getSettings()
  await Winetricks.runWithArgs(settings.wineVersion, settings.winePrefix, [
    'arial'
  ])
}

const downloadIfNotCached = async (cachePath: string, url: string) => {
  if (existsSync(cachePath)) {
    return true
  }

  try {
    const writer = createWriteStream(cachePath)

    const response = await axios.get(url, {
      responseType: 'stream'
    })

    await response.data.pipe(writer)

    return true
  } catch {
    logWarning(`Failed to download ${url}`, LogPrefix.Backend)
    return false
  }
}
