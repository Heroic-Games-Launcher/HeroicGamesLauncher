import { sendFrontendMessage } from './../main_window'
import { LogPrefix } from './../logger/logger'
import axios from 'axios'
import { cachedUbisoftInstallerPath } from 'backend/constants'
import { logWarning } from 'backend/logger/logger'
import { existsSync, createWriteStream } from 'graceful-fs'
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
    await downloadIfNotCached(cachedUbisoftInstallerPath, UBISOFT_INSTALLER_URL)

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
    await download(cachePath, url)
    return true
  } catch {
    logWarning(`Failed to download ${url}`, LogPrefix.Backend)
    return false
  }
}

// snippet took from https://stackoverflow.com/a/61269447/1430810, maybe can be improved
const download = async (cachePath: string, url: string) => {
  const writer = createWriteStream(cachePath)

  return axios
    .get(url, {
      responseType: 'stream'
    })
    .then(async (response) => {
      return new Promise((resolve, reject) => {
        response.data.pipe(writer)
        let error: unknown = null
        writer.on('error', (err) => {
          error = err
          writer.close()
          reject(err)
        })
        writer.on('close', () => {
          if (!error) {
            resolve(true)
          }
        })
      })
    })
}
