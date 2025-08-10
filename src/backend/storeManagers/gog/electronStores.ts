import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GOGGameInfo } from 'common/types'
import {
  GOGSessionSyncQueueItem,
  GamesDBData,
  GogInstallInfo
} from 'common/types/gog'

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

const apiInfoCache = new CacheStore<GamesDBData>('gog_api_info')
const libraryStore = new CacheStore<GOGGameInfo[], 'games'>('gog_library', null)
const syncStore = new TypeCheckedStoreBackend('gogSyncStore', {
  cwd: 'gog_store',
  name: 'saveTimestamps',
  clearInvalidConfig: true
})

const installInfoStore = new CacheStore<GogInstallInfo>('gog_install_info')

const privateBranchesStore = new TypeCheckedStoreBackend('gogPrivateBranches', {
  cwd: 'gog_store',
  name: 'privateBranches',
  clearInvalidConfig: true
})

const playtimeSyncQueue = new CacheStore<Array<GOGSessionSyncQueueItem>>(
  'gog_playtime_sync_queue'
)

export {
  configStore,
  installedGamesStore,
  apiInfoCache,
  libraryStore,
  syncStore,
  installInfoStore,
  playtimeSyncQueue,
  privateBranchesStore
}
