import { BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron'
import i18next from 'i18next'
import { logInfo, LogPrefix } from './logger/logger'
import { backendEvents } from './main'
import { handleProtocol } from './protocol'
import { getRecentGames } from './recent_games'
import { handleExit, showAboutWindow } from './utils'
import { GlobalConfig } from './config'
import { iconDark, iconLight } from './constants'

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

const contextMenu = async (mainWindow: BrowserWindow) => {
  const recentsMenu = (await getRecentGames({ limited: true })).map((game) => {
    return {
      click: function () {
        handleProtocol(mainWindow, [`heroic://launch/${game.appName}`])
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
      accelerator: process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
      click: function () {
        mainWindow.reload()
      },
      label: i18next.t('tray.reload', 'Reload')
    },
    {
      label: 'Debug',
      accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
      click: () => {
        mainWindow.webContents.openDevTools()
      }
    },
    {
      click: function () {
        handleExit(mainWindow)
      },
      label: i18next.t('tray.quit', 'Quit'),
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q'
    }
  ])
}

export const initTrayIcon = async (mainWindow: BrowserWindow) => {
  const settings = await GlobalConfig.get().getSettings()
  const { darkTrayIcon } = settings

  const trayIcon = nativeImage
    .createFromPath(darkTrayIcon ? iconDark : iconLight)
    .resize(iconSizesByPlatform[process.platform])

  const appIcon = new Tray(trayIcon)

  appIcon.on('double-click', () => {
    mainWindow.show()
  })

  appIcon.setContextMenu(await contextMenu(mainWindow))
  appIcon.setToolTip('Heroic')

  ipcMain.on('changeLanguage', async () => {
    appIcon.setContextMenu(await contextMenu(mainWindow))
  })

  ipcMain.addListener('changeTrayColor', () => {
    logInfo('Changing Tray icon Color...', { prefix: LogPrefix.Backend })
    setTimeout(async () => {
      const { darkTrayIcon } = await GlobalConfig.get().getSettings()
      const trayIcon = nativeImage
        .createFromPath(darkTrayIcon ? iconDark : iconLight)
        .resize(iconSizesByPlatform[process.platform])
      appIcon.setImage(trayIcon)
      appIcon.setContextMenu(await contextMenu(mainWindow))
    }, 500)
  })

  backendEvents.on('recentGamesChanged', async () => {
    appIcon.setContextMenu(await contextMenu(mainWindow))
  })
}
