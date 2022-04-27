const Store = window.require('electron-store')
const configStore = new Store({
  cwd: 'store'
})
const libraryStore = new Store({
  cwd: 'lib-cache',
  name: 'library'
})
const wineDownloaderInfoStore = new Store({
  cwd: 'store',
  name: 'wine-downloader-info'
})

const gogLibraryStore = new Store({ cwd: 'gog_store', name: 'library' })
const gogInstalledGamesStore = new Store({
  cwd: 'gog_store',
  name: 'installed'
})
const gogConfigStore = new Store({
  cwd: 'gog_store'
})

const timestampStore = new Store({
  cwd: 'store',
  name: 'timestamp'
})

export {
  configStore,
  gogLibraryStore,
  gogInstalledGamesStore,
  gogConfigStore,
  libraryStore,
  timestampStore,
  wineDownloaderInfoStore
}
