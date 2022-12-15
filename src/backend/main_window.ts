import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { configStore, userHome } from './constants'

let mainWindow: BrowserWindow | null = null

export const getMainWindow = () => {
  return mainWindow
}

export const sendFrontendMessage = (message: string, ...payload: unknown[]) => {
  if (!mainWindow) {
    mainWindow = BrowserWindow.getAllWindows()[0]
  }

  if (!mainWindow) {
    return false
  }

  if (!mainWindow.webContents) {
    return false
  }

  return mainWindow.webContents.send(message, ...payload)
}

export const createMainWindow = () => {
  configStore.set('userHome', userHome)

  let windowProps: Electron.Rectangle = {
    height: 690,
    width: 1200,
    x: 0,
    y: 0
  }

  if (configStore.has('window-props')) {
    const tmpWindowProps = configStore.get(
      'window-props',
      {}
    ) as Electron.Rectangle
    if (
      tmpWindowProps &&
      tmpWindowProps.width &&
      tmpWindowProps.height &&
      tmpWindowProps.y !== undefined &&
      tmpWindowProps.x !== undefined
    ) {
      windowProps = tmpWindowProps
    }
  } else {
    // make sure initial screen size is not bigger than the available screen space
    const screenInfo = screen.getPrimaryDisplay()

    if (screenInfo.workAreaSize.height > windowProps.height) {
      windowProps.height = screenInfo.workAreaSize.height * 0.8
    }

    if (screenInfo.workAreaSize.width > windowProps.width) {
      windowProps.width = screenInfo.workAreaSize.width * 0.8
    }
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    ...windowProps,
    minHeight: 345,
    minWidth: 600,
    show: false,

    webPreferences: {
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: true,
      // sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  return mainWindow
}
