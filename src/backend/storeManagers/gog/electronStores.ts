import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GameInfo, GOGAchievement } from 'common/types'
import {
  GOGSessionSyncQueueItem,
  GamesDBData,
  GogInstallInfo
} from 'common/types/gog'
import { gogStorePath } from 'backend/constants/key_value_stores'

const installedGamesStore = new TypeCheckedStoreBackend(
  'gogInstalledGamesStore',
  {
    cwd: gogStorePath,
    name: 'installed'
  }
)

const configStore = new TypeCheckedStoreBackend('gogConfigStore', {
  cwd: gogStorePath
})

const apiInfoCache = new CacheStore<GamesDBData>('gog_api_info')
const libraryStore = new CacheStore<GameInfo[], 'games'>('gog_library', null)
const achievementStore = new CacheStore<GOGAchievement[]>(
  'gog_achievements',
  null
)
const syncStore = new TypeCheckedStoreBackend('gogSyncStore', {
  cwd: gogStorePath,
  name: 'saveTimestamps',
  clearInvalidConfig: true
})

const installInfoStore = new CacheStore<GogInstallInfo>('gog_install_info')

const privateBranchesStore = new TypeCheckedStoreBackend('gogPrivateBranches', {
  cwd: gogStorePath,
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
  achievementStore,
  syncStore,
  installInfoStore,
  playtimeSyncQueue,
  privateBranchesStore
}
