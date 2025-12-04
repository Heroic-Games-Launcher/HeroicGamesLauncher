import CacheStore from 'backend/cache'
import { TypeCheckedStoreBackend } from 'backend/electron_store'
import { GameInfo } from 'common/types'

export const steamEnabledUsers = new TypeCheckedStoreBackend(
  'steamEnabledUsersConfig',
  { cwd: 'steam_store' }
)

export const libraryCache = new CacheStore<GameInfo[], 'games'>('steam_library', null)
