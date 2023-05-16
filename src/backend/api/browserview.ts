import {
  IBrowserView,
  IBrowserViewIdentifier,
  IBrowserViewOptions
} from 'common/types/browserview'
import { ipcRenderer } from 'electron'

const browserviewExists = async (
  identifier: IBrowserViewIdentifier
): Promise<boolean> => ipcRenderer.invoke('browserview.exists', identifier)

const browserviewSet = async (
  identifier: IBrowserViewIdentifier,
  options: IBrowserViewOptions
) => ipcRenderer.send('browserview.set', identifier, options)

// A wrapper for interacting with the BrowserView remotely

export class RemoteBrowserView extends IBrowserView {
  get initialURL() {
    return ipcRenderer.sendSync('browserview.initialURL', this.identifier)
  }
  // FIXME: implement: the list has to be a mere shortcut to the backend, both get/set
  URLchanged: { (): void }[] = []
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
  set URL(newValue) {
    ipcRenderer.send('browserview.URL', this.identifier, newValue)
  }
  get bounds() {
    return ipcRenderer.sendSync('browserview.bounds', this.identifier)
  }
  set bounds(newValue) {
    ipcRenderer.send('browserview.bounds', this.identifier, newValue)
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

  private readonly identifier: IBrowserViewIdentifier

  constructor(
    identifier: IBrowserViewIdentifier,
    options: IBrowserViewOptions
  ) {
    super()
    this.identifier = identifier
    browserviewExists(identifier).then((exists) => {
      if (!exists) browserviewSet(identifier, options)
    })
  }
}

export let currentBrowserView: IBrowserView | undefined = undefined

ipcRenderer.on('browserview.URLchanged.run', (_, identifier, options) => {
  new RemoteBrowserView(identifier, options)!.URLchanged.forEach((callback) =>
    callback()
  )
})

// Notify preload to change "currentBrowserView" when
// main browser view changes for main window
// identifier could be undefined
ipcRenderer.on(
  'browserview.main-changed',
  (
    _,
    identifier: IBrowserViewIdentifier | undefined,
    options: IBrowserViewOptions | undefined
  ) => {
    // If there is no identifier, set currentBrowserView to undefined
    if (!identifier || !options) {
      currentBrowserView = undefined
      return
    }
    currentBrowserView = new RemoteBrowserView(identifier, options)
  }
)

export const setMainBrowserView = (
  identifier: IBrowserViewIdentifier,
  options: IBrowserViewOptions
) => {
  ipcRenderer.send('browserview.set_main', identifier, options)
}
