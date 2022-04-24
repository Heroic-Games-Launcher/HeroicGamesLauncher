import Store from 'electron-store'

const installedGamesStore = new Store({
  cwd: 'gog_store',
  name: 'installed'
})

const configStore = new Store({
  cwd: 'gog_store'
})

const apiInfoCache = new Store({
  cwd: 'gog_store',
  name: 'api_info_cache'
})
const libraryStore = new Store({ cwd: 'gog_store', name: 'library' })

export { configStore, installedGamesStore, apiInfoCache, libraryStore }
