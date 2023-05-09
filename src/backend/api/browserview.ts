import { IBrowserViewWrapper } from 'common/types/browserview'
import { ipcRenderer } from 'electron/renderer'

// A wrapper for interacting with the BrowserView remotely

class RemoteBrowserViewWrapper extends IBrowserViewWrapper {
  get initialURL() {
    return ipcRenderer.sendSync('browserview.initialURL', this.identifier)
  }
  get canGoBack() {
    return ipcRenderer.sendSync('browserview.canGoBack', this.identifier)
  }
  get canGoForward() {
    return ipcRenderer.sendSync('browserview.canGoForward', this.identifier)
  }
  goBack(): void {
    ipcRenderer.send('browserview.goBack', this.identifier)
  }
  goForward(): void {
    ipcRenderer.send('browserview.goForward', this.identifier)
  }
  reload(): void {
    ipcRenderer.send('browserview.reload', this.identifier)
  }
  get isLoading() {
    return ipcRenderer.sendSync('browserview.isLoading', this.identifier)
  }
  get URL() {
    return ipcRenderer.sendSync('browserview.URL', this.identifier)
  }
  get bounds() {
    return ipcRenderer.sendSync('browserview.bounds', this.identifier)
  }

  private readonly identifier: string

  constructor(identifier: string) {
    super()
    this.identifier = identifier
  }
}

export let currentBrowserView: IBrowserViewWrapper | undefined = undefined

// Notify preload to change "currentBrowserView" when
// main browser view changes for main window
// identifier could be undefined
ipcRenderer.on(
  'browserview.main-changed',
  (_, identifier: string | undefined) => {
    // If there is no identifier, set currentBrowserView to undefined
    if (!identifier) {
      currentBrowserView = undefined
      return
    }
    currentBrowserView = new RemoteBrowserViewWrapper(identifier)
  }
)

export const setMainBrowserView = (identifier: string) => {
  ipcRenderer.send('browserview.set_main', identifier)
}
