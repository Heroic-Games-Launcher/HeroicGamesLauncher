import { EventEmitter } from 'node:events'
import { MenuItemConstructorOptions } from 'electron'
import { tmpdir } from 'os'
import { join } from 'path'

const appBasePath = tmpdir()
const dialog = {
  // dialog override
  showErrorBox: jest.fn(),
  showMessageBox: jest.fn()
}

const app = {
  // app override
  getPath: jest.fn().mockImplementation((path: string) => {
    return join(appBasePath, path)
  })
}

class Notification {
  public show() {
    return
  }

  public isSupported() {
    return false
  }
}

class BrowserWindow {
  public constructor() {
    return {}
  }
}

const Menu = {
  buildFromTemplate(options: MenuItemConstructorOptions[]) {
    return options
  }
}

const nativeImage = {
  createFromPath: (path: string) => ({
    resize: (size: { width: number; height: number }) =>
      `${path} width=${size.width} height=${size.height}`
  })
}

class Tray {
  icon: string = ''
  menu: MenuItemConstructorOptions[] = []
  tooltip: string = ''

  constructor(icon: string) {
    this.icon = icon
  }

  on(event: string) {}

  setContextMenu(menu: MenuItemConstructorOptions[]) {
    this.menu = menu
  }

  setToolTip(tooltip: string) {
    this.tooltip = tooltip
  }
}

const ipcMain = new EventEmitter()

export {
  dialog,
  app,
  Notification,
  BrowserWindow,
  Menu,
  nativeImage,
  Tray,
  ipcMain
}
