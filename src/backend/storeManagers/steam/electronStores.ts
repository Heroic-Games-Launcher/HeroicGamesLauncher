import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { ExtraInfo, GameInfo } from 'common/types'

const installedGamesStore = new TypeCheckedStoreBackend(
  'steamInstalledGamesStore',
  {
    cwd: 'steam_store',
    name: 'installed'
  }
)

const configStore = new TypeCheckedStoreBackend('steamConfigStore', {
  cwd: 'steam_store'
})

const libraryStore = new CacheStore<GameInfo[], 'games'>('steam_library', null)

// Caches the Steam storefront "appdetails" response (description, requirements,
// release date, etc.) per app id so we don't hit the API on every page open.
const extraInfoStore = new CacheStore<ExtraInfo>('steam_extra_info')

export { configStore, installedGamesStore, libraryStore, extraInfoStore }
