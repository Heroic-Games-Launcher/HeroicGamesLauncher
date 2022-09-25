import { GameSettings, GameInfo, SideloadGame } from '../../common/types'
import { libraryStore } from './electronStores'
import { GameConfig } from '../game_config'
import {
  isWindows,
  isMac,
  isLinux,
  execOptions,
  heroicGamesConfigPath
} from '../constants'
import { execAsync, killPattern, notify } from '../utils'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { SideLoadLibrary } from './library'
import { dirname, join } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import i18next from 'i18next'
import { runWineCommand } from '../launcher'

export function appLogFileLocation(appName: string) {
  return join(heroicGamesConfigPath, `${appName}-lastPlay.log`)
}

export function getAppInfo(appName: string): GameInfo {
  const store = libraryStore.get('games', []) as GameInfo[]
  return store.filter((app) => app.app_name === appName)[0] || {}
}

export async function getAppSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export function addNewApp({
  app_name,
  title,
  install: { executable, platform },
  art_cover = 'fallback',
  art_square = 'fallback'
}: SideloadGame): void {
  console.log({
    appName: {
      runner: 'sideload',
      app_name,
      title,
      install: {
        executable,
        platform
      },
      folder_name: dirname(executable),
      art_cover,
      platform
    }
  })

  const game: SideloadGame = {
    runner: 'sideload',
    app_name,
    title,
    install: {
      executable,
      platform
    },
    folder_name: dirname(executable),
    art_cover,
    is_installed: true,
    art_square
  }

  const current = libraryStore.get('games', []) as SideloadGame[]
  current.push(game)
  return libraryStore.set('games', current)
}

export async function addShortcuts(): Promise<void> {
  throw new Error('Method not implemented.')
}

export async function launchApp(appName: string): Promise<boolean> {
  const {
    install: { executable },
    folder_name
  } = getAppInfo(appName)
  if (executable) {
    const gameSettings = await getAppSettings(appName)
    await runWineCommand({
      command: executable,
      gameSettings,
      installFolderName: folder_name,
      wait: false,
      forceRunInPrefixVerb: false
    })
    return true
  }
  return false
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<string> {
  const {
    install: { install_path },
    title
  } = getAppInfo(appName)

  if (!install_path) {
    return ''
  }

  if (isWindows) {
    newInstallPath += '\\' + install_path.split('\\').at(-1)
  } else {
    newInstallPath += '/' + install_path.split('/').at(-1)
  }

  logInfo(`Moving ${title} to ${newInstallPath}`, {
    prefix: LogPrefix.Backend
  })
  await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
    .then(() => {
      SideLoadLibrary.get().changeGameInstallPath(appName, newInstallPath)
      logInfo(`Finished Moving ${title}`, { prefix: LogPrefix.Backend })
    })
    .catch((error) => logError(`${error}`, { prefix: LogPrefix.Backend }))
  return newInstallPath
}
export async function stop(appName: string): Promise<void> {
  const {
    install: { executable }
  } = getAppInfo(appName)

  if (executable) {
    killPattern(executable)
  }
}

type RemoveArgs = {
  appName: string
  shouldRemovePrefix: boolean
}
export async function removeApp({
  appName,
  shouldRemovePrefix
}: RemoveArgs): Promise<void> {
  const old = libraryStore.get('games', []) as SideloadGame[]
  const current = old.filter((a: SideloadGame) => a.app_name !== appName)
  libraryStore.set('games', current)

  const { title } = getAppInfo(appName)
  const { winePrefix } = await getAppSettings(appName)

  if (shouldRemovePrefix) {
    logInfo(`Removing prefix ${winePrefix}`, { prefix: LogPrefix.Backend })
    if (existsSync(winePrefix)) {
      // remove prefix if exists
      rmSync(winePrefix, { recursive: true })
    }
  }
  notify({ title, body: i18next.t('notify.uninstalled') })
  return logInfo('finished uninstalling', { prefix: LogPrefix.Backend })
}

export function isNative(appName: string): boolean {
  const gameInfo = getAppInfo(appName)
  if (isWindows) {
    return true
  }

  if (isMac && gameInfo.install.platform === 'osx') {
    return true
  }

  if (isLinux && gameInfo.install.platform === 'linux') {
    return true
  }

  return false
}
