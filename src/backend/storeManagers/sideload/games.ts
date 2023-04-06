import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform
} from 'common/types'
import { libraryStore } from './electronStores'
import { GameConfig } from '../../game_config'
import { isWindows, isMac, isLinux, icon } from '../../constants'
import { killPattern } from '../../utils'
import { logInfo, LogPrefix, logWarning } from '../../logger/logger'
import path, { dirname, resolve } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import i18next from 'i18next'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { notify } from '../../dialog/dialog'
import { sendFrontendMessage } from '../../main_window'
import { app, BrowserWindow } from 'electron'
import { launchGame } from 'backend/storeManagers/storeManagerCommon/games'
import { GOGCloudSavesLocation } from 'common/types/gog'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
const buildDir = resolve(__dirname, '../../build')

export function getGameInfo(appName: string): GameInfo {
  const store = libraryStore.get('games', [])
  const info = store.find((app) => app.app_name === appName)
  if (!info) {
    // @ts-expect-error TODO: As with LegendaryGame and GOGGame, handle this properly
    return {}
  }
  return info
}

export async function getSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

export async function removeShortcuts(appName: string): Promise<void> {
  return removeShortcutsUtil(getGameInfo(appName))
}

export function isGameAvailable(appName: string): boolean {
  const { install } = getGameInfo(appName)

  if (install && install.platform === 'Browser') {
    return true
  }

  if (install && install.executable) {
    return existsSync(install.executable)
  }
  return false
}

if (Object.hasOwn(app, 'on'))
  app.on('web-contents-created', (_, contents) => {
    // Check for a webview
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        const protocol = new URL(url).protocol
        if (['https:', 'http:'].includes(protocol)) {
          openNewBrowserGameWindow(url)
        }
        return { action: 'deny' }
      })
    }
  })

const openNewBrowserGameWindow = async (
  browserUrl: string
): Promise<boolean> => {
  return new Promise((res) => {
    const browserGame = new BrowserWindow({
      icon: icon,
      webPreferences: {
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: true,
        preload: path.join(__dirname, 'preload.js')
      }
    })

    const url = !app.isPackaged
      ? 'http://localhost:5173?view=BrowserGame&browserUrl=' +
        encodeURIComponent(browserUrl)
      : `file://${path.join(
          buildDir,
          './index.html?view=BrowserGame&browserUrl=' +
            encodeURIComponent(browserUrl)
        )}`

    browserGame.loadURL(url)
    setTimeout(() => browserGame.focus(), 200)
    browserGame.on('close', () => {
      res(true)
    })
  })
}

export async function launch(
  appName: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  launchArguments?: string
): Promise<boolean> {
  return launchGame(appName, getGameInfo(appName), 'sideload')
}

export async function stop(appName: string): Promise<void> {
  const {
    install: { executable = undefined }
  } = getGameInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)
  }
}

export async function uninstall({
  appName,
  shouldRemovePrefix,
  deleteFiles = false
}: RemoveArgs): Promise<ExecResult> {
  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: 'sideload',
    status: 'uninstalling'
  })

  const old = libraryStore.get('games', [])
  const current = old.filter((a: GameInfo) => a.app_name !== appName)

  const {
    title,
    install: { executable }
  } = getGameInfo(appName)
  const { winePrefix } = await getSettings(appName)

  if (shouldRemovePrefix) {
    logInfo(`Removing prefix ${winePrefix}`, LogPrefix.Backend)
    if (existsSync(winePrefix)) {
      // remove prefix if exists
      rmSync(winePrefix, { recursive: true })
    }
  }
  libraryStore.set('games', current)

  if (deleteFiles && executable !== undefined) {
    rmSync(dirname(executable), { recursive: true })
  }

  notify({ title, body: i18next.t('notify.uninstalled') })

  removeShortcuts(appName)

  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: 'sideload',
    status: 'done'
  })

  logInfo('finished uninstalling', LogPrefix.Backend)
  return { stderr: '', stdout: '' }
}

export function isNative(appName: string): boolean {
  const {
    install: { platform }
  } = getGameInfo(appName)
  if (platform) {
    if (platform === 'Browser') {
      return true
    }

    if (isWindows) {
      return true
    }

    if (isMac && platform === 'Mac') {
      return true
    }

    // small hack, but needs to fix the typings
    const plat = platform.toLowerCase()
    if (isLinux && plat === 'linux') {
      return true
    }
  }

  return false
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  logWarning(
    `getExtraInfo not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return {
    about: {
      description: '',
      shortDescription: ''
    },
    reqs: [],
    storeUrl: ''
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
) {
  logWarning(
    `onInstallOrUpdateOutput not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  logWarning(
    `moveInstall not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return { status: 'error' }
}

export async function repair(appName: string): Promise<ExecResult> {
  logWarning(
    `repair not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return { stderr: '', stdout: '' }
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[]
): Promise<string> {
  logWarning(
    `syncSaves not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return ''
}

export async function forceUninstall(appName: string): Promise<void> {
  logWarning(
    `forceUninstall not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
}

export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  logWarning(
    `forceUninstall not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return { status: 'error' }
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  return { stderr: '', stdout: '' }
}

export async function update(
  appName: string
): Promise<{ status: 'done' | 'error' }> {
  return { status: 'error' }
}
