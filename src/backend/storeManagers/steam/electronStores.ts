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
// The `_v2` suffix is a cache-schema bump: older entries predate the `background`
// (splash) and `score` fields, so orphaning them forces a fresh fetch the next
// time a game is viewed - making the new info show up right away instead of
// after the cache's normal lifespan.
const extraInfoStore = new CacheStore<ExtraInfo>('steam_extra_info_v2')

// Caches resolved app id -> game name pairs (from Steam's public GetAppList),
// used to name owned-but-not-installed games discovered from the local Steam
// client data when the user's profile is private. Long lifespan: app names
// rarely change.
const appNamesStore = new CacheStore<string>('steam_app_names', 60 * 24 * 7)

export {
  configStore,
  installedGamesStore,
  libraryStore,
  extraInfoStore,
  appNamesStore
}
