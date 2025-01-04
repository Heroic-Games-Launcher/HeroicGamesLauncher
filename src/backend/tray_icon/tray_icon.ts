import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron'
import i18next from 'i18next'
import { RecentGame } from 'common/types'
import { logInfo, LogPrefix } from '../logger/logger'
import { handleProtocol } from '../protocol'
import { getRecentGames, maxRecentGames } from '../recent_games/recent_games'
import { handleExit, showAboutWindow } from '../utils'
import { GlobalConfig } from '../config'
import { iconDark, iconLight, isMac } from '../constants'
import { backendEvents } from '../backend_events'

export const initTrayIcon = async (mainWindow: BrowserWindow) => {
  // create icon
  const appIcon = new Tray(getIcon(process.platform))

  // helper function to set/update the context menu and on macOS the dock menu
  const loadContextMenu = async (recentGames?: RecentGame[]) => {
    recentGames ??= await getRecentGames({ limited: true })
    const newContextMenu = contextMenu(mainWindow, recentGames)
    appIcon.setContextMenu(newContextMenu)
    if (isMac) app.dock.setMenu(newContextMenu)
  }
  await loadContextMenu()

  appIcon.setToolTip('Heroic')

  // event listeners
  appIcon.on('click', () => {
    mainWindow.show()
  })

  ipcMain.on('changeLanguage', async () => {
    await loadContextMenu()
  })

  ipcMain.on('changeTrayColor', () => {
    logInfo('Changing Tray icon Color...', LogPrefix.Backend)
    setTimeout(async () => {
      appIcon.setImage(getIcon(process.platform))
      await loadContextMenu()
    }, 500)
  })

  backendEvents.on('recentGamesChanged', async (recentGames: RecentGame[]) => {
    const limit = await maxRecentGames()
    if (recentGames.length > limit) {
      recentGames = recentGames.slice(0, limit)
    }
    await loadContextMenu(recentGames)
  })

  return appIcon
}

const iconSizesByPlatform = {
  darwin: {
    width: 20,
    height: 20
  },
  linux: {
    width: 32,
    height: 32
  },
  win32: {
    width: 32,
    height: 32
  }
}

// get the icon path based on platform and settings
const getIcon = (platform = process.platform) => {
  const settings = GlobalConfig.get().getSettings()
  const { darkTrayIcon } = settings

  return nativeImage
    .createFromPath(darkTrayIcon ? iconDark : iconLight)
    .resize(iconSizesByPlatform[platform])
}

// generate the context menu
const contextMenu = (
  mainWindow: BrowserWindow,
  recentGames: RecentGame[],
  platform = process.platform
) => {
  const recentsMenu = recentGames.map((game) => {
    return {
      click: function () {
        handleProtocol([`heroic://launch?appName=${game.appName}`])
      },
      label: game.title
    }
  })

  return Menu.buildFromTemplate([
    ...recentsMenu,
    { type: 'separator' },
    {
      click: function () {
        mainWindow.show()
      },
      label: i18next.t('tray.show')
    },
    {
      click: function () {
        showAboutWindow()
      },
      label: i18next.t('tray.about', 'About')
    },
    {
      accelerator: platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
      click: function () {
        mainWindow.reload()
      },
      label: i18next.t('tray.reload', 'Reload')
    },
    {
      label: 'Debug',
      accelerator: platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
      click: () => {
        mainWindow.webContents.openDevTools()
      }
    },
    {
      click: function () {
        handleExit()
      },
      label: i18next.t('tray.quit', 'Quit'),
      accelerator: platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q'
    }
  ])
}

// Exported only for testing purpose
// ts-prune-ignore-next
export const testingExportsTrayIcon = {
  contextMenu,
  getIcon
}
