// const Store = window.require('electron-store')
// import Store from 'electron-store'

export class StoreIpc {
  storeName: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(name: string, options: any) {
    // Store.Options<Record<string, unknown>>) {
    this.storeName = name
    window.api.storeNew(name, options)
  }

  public has(key: string): boolean {
    return window.api.storeHas(this.storeName, key)
  }

  public get(key: string, defaultValue?: unknown) {
    return window.api.storeGet(this.storeName, key, defaultValue)
  }

  public set(key: string, value?: unknown) {
    window.api.storeSet(this.storeName, key, value)
  }
}
const configStore = new StoreIpc('configStore', {
  cwd: 'store'
})
const libraryStore = new StoreIpc('libraryStore', {
  cwd: 'lib-cache',
  name: 'library'
})
const wineDownloaderInfoStore = new StoreIpc('wineDownloaderInfoStore', {
  cwd: 'store',
  name: 'wine-downloader-info'
})

const gogLibraryStore = new StoreIpc('gogLibraryStore', {
  cwd: 'gog_store',
  name: 'library'
})
const gogInstalledGamesStore = new StoreIpc('gogInstalledGamesStore', {
  cwd: 'gog_store',
  name: 'installed'
})
const gogConfigStore = new StoreIpc('gogConfigStore', {
  cwd: 'gog_store'
})

const timestampStore = new StoreIpc('timestampStore', {
  cwd: 'store',
  name: 'timestamp'
})

const sideloadLibrary = new StoreIpc('sideloadedStore', {
  cwd: 'sideload_apps',
  name: 'library'
})

export {
  configStore,
  gogLibraryStore,
  gogInstalledGamesStore,
  gogConfigStore,
  libraryStore,
  timestampStore,
  sideloadLibrary,
  wineDownloaderInfoStore
}
