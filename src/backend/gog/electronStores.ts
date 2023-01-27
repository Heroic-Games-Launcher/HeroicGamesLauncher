import { TypeCheckedStoreBackend } from './../electron_store'

const installedGamesStore = new TypeCheckedStoreBackend(
  'gogInstalledGamesStore',
  {
    cwd: 'gog_store',
    name: 'installed'
  }
)

const configStore = new TypeCheckedStoreBackend('gogConfigStore', {
  cwd: 'gog_store'
})

const apiInfoCache = new TypeCheckedStoreBackend('gogApiInfoCache', {
  cwd: 'gog_store',
  name: 'api_info_cache',
  clearInvalidConfig: true
})
const libraryStore = new TypeCheckedStoreBackend('gogLibraryStore', {
  cwd: 'gog_store',
  name: 'library',
  clearInvalidConfig: true
})
const syncStore = new TypeCheckedStoreBackend('gogSyncStore', {
  cwd: 'gog_store',
  name: 'saveTimestamps',
  clearInvalidConfig: true
})

export {
  configStore,
  installedGamesStore,
  apiInfoCache,
  libraryStore,
  syncStore
}
