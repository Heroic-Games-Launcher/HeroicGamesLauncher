import { BrowserView, BrowserWindow, ipcMain } from 'electron/main'
import { IBrowserView } from 'common/types/browserview'
import { getMainWindow } from 'backend/main_window'

class NodeBrowserView extends IBrowserView {
  private view: BrowserView
  initialURL: string

  constructor({ initialURL }: { initialURL: string }) {
    super()
    this.view = new BrowserView()
    this.initialURL = initialURL
  }

  get isLoading() {
    return this.view.webContents.isLoading()
  }

  get URL() {
    return this.view.webContents.getURL()
  }

  set URL(newURL: string) {
    this.view.webContents.loadURL(newURL)
  }

  get bounds() {
    return this.view.getBounds()
  }

  set bounds(rectangle) {
    this.view.setBounds(rectangle)
  }

  get canGoBack() {
    return this.view.webContents.canGoBack()
  }

  get canGoForward() {
    return this.view.webContents.canGoForward()
  }

  reload() {
    this.view.webContents.reload()
  }

  goForward() {
    this.view.webContents.goForward()
  }
  goBack() {
    this.view.webContents.goBack()
  }
}

// Create and remove webviews on demand
export const viewListService: Map<string, NodeBrowserView> = new Map()

export function setMainBrowserView({
  identifier,
  browserWindow,
  initialURL
}: {
  identifier: string
  browserWindow: BrowserWindow
  initialURL: string
}): void {
  // FIXME: repeating viewListService[identifier] too much,
  // however javascript doesn't have pointers
  if (!viewListService[identifier]) {
    viewListService[identifier] = new NodeBrowserView({ initialURL })
  }
  browserWindow.setBrowserView(viewListService[identifier])
}

// IPC: set main browser view in main window
ipcMain.on('browserview.set-main', (_, identifier, { initialURL } : { initialURL: string }) => setMainBrowserView(identifier, getMainWindow(), initialURL))

// IPC: does browserview exist in the list service?
ipcMain.handle('browserview.exists', (_, identifier) => !viewListService[identifier])
// IPC: set (or remove, undefined) a browserview in the list. Must be a IBrowserView
ipcMain.on('browserview.set', (_, identifier, { initialURL } : { initialURL: string }) => { viewListService[identifier] = new NodeBrowserView({ initialURL }) })

ipcMain.on('browserview.initialURL', (event, identifier) => {
    event.returnValue = viewListService[identifier].initialURL
})

ipcMain.on('browserview.canGoBack', (event, identifier) => {
    event.returnValue = viewListService[identifier].canGoBack
})

ipcMain.on('browserview.canGoForward', (event, identifier) => {
    event.returnValue = viewListService[identifier].canGoForward
})

ipcMain.on('browserview.isLoading', (event, identifier) => {
    event.returnValue = viewListService[identifier].isLoading
})

ipcMain.on('browserview.URL', (event, identifier) => {
    event.returnValue = viewListService[identifier].URL
})

ipcMain.on('browserview.bounds', (event, identifier) => {
    event.returnValue = viewListService[identifier].bounds
})

ipcMain.on('browserview.goBack', (event, identifier) => {
    viewListService[identifier].goBack()
})

ipcMain.on('browserview.goForward', (event, identifier) => {
    viewListService[identifier].goForward()
})

ipcMain.on('browserview.reload', (event, identifier) => {
    viewListService[identifier].reload()
})

