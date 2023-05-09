import { BrowserView, BrowserWindow, Rectangle } from 'electron';
import { IBrowserViewWrapper } from 'common/types/browserview'

class BrowserViewWrapper extends IBrowserViewWrapper {
  private view: BrowserView
  initialURL: string

  constructor({ initialURL }: { initialURL: string }) {
    super();
    this.view = new BrowserView()
    this.initialURL = initialURL
  }
  
  get isLoading () {
    return this.view.webContents.isLoading();
  }

  get URL () {
    return this.view.webContents.getURL()
  }
  
  set URL (newURL: string) {
    this.view.webContents.loadURL(newURL)
  }
  
  get bounds() {
    return this.view.getBounds()
  }

  set bounds(rectangle) {
    this.view.setBounds(rectangle);
  }

  get canGoBack() {
    return this.view.webContents.canGoBack();
  }

  get canGoForward() {
    return this.view.webContents.canGoForward();
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
export var viewListService: Map<string, BrowserViewWrapper> = new Map();

export function safelySetMainBrowserView({ identifier, browserWindow, initialURL } : { identifier: string, browserWindow: BrowserWindow, initialURL: string}): void {
  // FIXME: repeating viewListService[identifier] too much,
  // however javascript doesn't have pointers
  if (!viewListService[identifier]) {
    viewListService[identifier] = new BrowserViewWrapper({ initialURL })
  }
  browserWindow.setBrowserView(viewListService[identifier])
}
