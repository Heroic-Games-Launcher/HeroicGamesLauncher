import { IBrowserView } from 'common/types/browserview'
import { ipcRenderer } from 'electron/renderer'

const browserviewExists = async (identifier: string): Promise<boolean> =>
  ipcRenderer.invoke('browserview.exists', identifier)

const browserviewSet = async (
  identifier: string,
  { initialURL }: { initialURL: string }
) => ipcRenderer.send('browserview.set', identifier, { initialURL })

// A wrapper for interacting with the BrowserView remotely

class RemoteBrowserView extends IBrowserView {
  get initialURL() {
    return ipcRenderer.sendSync('browserview.initialURL', this.identifier)
  }
  // TODO: URLchanged event is local, is this a good idea? Has to be called from the backend
  URLchanged: { () => void }[]
  get canGoBack() {
    return ipcRenderer.sendSync('browserview.canGoBack', this.identifier)
  }
  get canGoForward() {
    return ipcRenderer.sendSync('browserview.canGoForward', this.identifier)
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
  goBack(): void {
    ipcRenderer.send('browserview.goBack', this.identifier)
  }
  goForward(): void {
    ipcRenderer.send('browserview.goForward', this.identifier)
  }
  reload(): void {
    ipcRenderer.send('browserview.reload', this.identifier)
  }

  private readonly identifier: string

  constructor(identifier: string, { initialURL }: { initialURL: string }) {
    super()
    this.identifier = identifier
    browserviewExists(identifier).then((exists) => {
      if (!exists) browserviewSet(identifier, { initialURL })
    })
  }
}

export const browserViewFromIdentifier = (
  identifier: string,
  { initialURL }: { initialURL: string }
) => new RemoteBrowserView(identifier, { initialURL })

export let currentBrowserView: IBrowserView | undefined = undefined

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
    currentBrowserView = new RemoteBrowserView(identifier)
  }
)

export const setMainBrowserView = (
  identifier: string,
  { initialURL }: { initialURL: string }
) => {
  ipcRenderer.send('browserview.set_main', identifier, { initialURL })
}
