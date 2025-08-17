import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GameInfo } from 'common/types'
import { ZoomInstallInfo } from 'common/types/zoom'

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

const libraryStore = new CacheStore<GameInfo[], 'games'>('zoom_library', null)

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
  libraryStore,
  installInfoStore
  // privateBranchesStore,
  // playtimeSyncQueue
}
