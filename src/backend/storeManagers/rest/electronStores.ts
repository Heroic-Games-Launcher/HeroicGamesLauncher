import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GameInfo, InstalledInfo } from 'common/types'

const restConfigStore = new TypeCheckedStoreBackend('restConfigStore', {
  cwd: 'rest_store',
  name: 'config'
})

const restLibraryStore = new CacheStore<GameInfo[], 'games'>('rest_library', null)
const restInstalledGamesStore = new TypeCheckedStoreBackend('restInstalledGamesStore', {
  cwd: 'rest_store',
  name: 'installed'
})

export {
  restConfigStore,
  restLibraryStore,
  restInstalledGamesStore
}

