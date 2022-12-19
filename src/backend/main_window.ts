import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { configStore } from './constants'

let mainWindow: BrowserWindow | null = null

export const setMainWindow = (window: BrowserWindow | null = null) => {
  mainWindow = window
}

export const getMainWindow = () => {
  return mainWindow
}

// send a message to the main window's webContents if available
// returns `false` if no mainWindow or no webContents
// returns `true` if the message was sent to the webContents
export const sendFrontendMessage = (message: string, ...payload: unknown[]) => {
  // get the first BrowserWindow if for some reason we don't have a webContents
  if (!mainWindow?.webContents) {
    mainWindow = BrowserWindow.getAllWindows()[0]
  }

  // return false if we still don't have a webContents
  if (!mainWindow?.webContents) {
    return false
  }

  mainWindow.webContents.send(message, ...payload)
  return true
}

// creates the mainWindow based on the configuration
export const createMainWindow = () => {
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

    if (screenInfo.workAreaSize.height < windowProps.height) {
      windowProps.height = screenInfo.workAreaSize.height * 0.8
    }

    if (screenInfo.workAreaSize.width < windowProps.width) {
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
