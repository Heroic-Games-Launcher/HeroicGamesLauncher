import { WindowProps } from 'common/types'
import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { configStore } from './constants'
import { getGlobalConfig } from './config/global'

let mainWindow: BrowserWindow | null = null

export const getMainWindow = () => {
  return mainWindow
}

let windowProps: WindowProps | null = null

export const isFrameless = () => {
  return windowProps?.frame === false || windowProps?.titleBarStyle === 'hidden'
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
  windowProps = {
    height: 690,
    width: 1200,
    x: 0,
    y: 0,
    maximized: false
  } as WindowProps

  if (configStore.has('window-props')) {
    windowProps = configStore.get('window-props', windowProps)
  } else {
    // make sure initial screen size is not bigger than the available screen space
    const screenInfo = screen.getPrimaryDisplay()

    if (screenInfo?.workAreaSize?.height < windowProps.height) {
      windowProps.height = screenInfo.workAreaSize.height * 0.8
    }

    if (screenInfo?.workAreaSize?.width < windowProps.width) {
      windowProps.width = screenInfo.workAreaSize.width * 0.8
    }
  }
  // Set up frameless window if enabled in settings
  const { framelessWindow } = getGlobalConfig()
  if (framelessWindow) {
    // use native overlay controls where supported
    if (['darwin', 'win32'].includes(process.platform)) {
      windowProps.titleBarStyle = 'hidden'
      windowProps.titleBarOverlay = true
    } else {
      windowProps.frame = false
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
