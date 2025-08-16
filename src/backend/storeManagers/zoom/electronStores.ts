import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GameInfo } from 'common/types'
import { ZoomGameInfo, ZoomInstallInfo } from 'common/types/zoom'

const installedGamesStore = new TypeCheckedStoreBackend(
  'zoomInstalledGamesStore',
  {
    cwd: 'zoom_store',
    name: 'installed'
  }
)

const configStore = new TypeCheckedStoreBackend('zoomConfigStore', {
  cwd: 'zoom_store'
})

const apiInfoCache = new CacheStore<ZoomGameInfo>('zoom_api_info')
const libraryStore = new CacheStore<GameInfo[], 'games'>('zoom_library', null)
const syncStore = new TypeCheckedStoreBackend('zoomSyncStore', {
  cwd: 'zoom_store',
  name: 'saveTimestamps',
  clearInvalidConfig: true
})

const installInfoStore = new CacheStore<ZoomInstallInfo>('zoom_install_info')

// No direct equivalent for privateBranchesStore in Zoom based on the Python example
// const privateBranchesStore = new TypeCheckedStoreBackend('zoomPrivateBranches', {
//   cwd: 'zoom_store',
//   name: 'privateBranches',
//   clearInvalidConfig: true
// })

// No direct equivalent for playtimeSyncQueue in Zoom based on the Python example
// const playtimeSyncQueue = new CacheStore<Array<ZoomSessionSyncQueueItem>>(
//   'zoom_playtime_sync_queue'
// )

export {
  configStore,
  installedGamesStore,
  apiInfoCache,
  libraryStore,
  syncStore,
  installInfoStore
  // privateBranchesStore,
  // playtimeSyncQueue
}
