import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { ExtraInfo, GameInfo } from 'common/types'
import { SteamInstallInfo } from 'common/types/steam'

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

// Caches the Steam storefront "appdetails" response
const extraInfoStore = new CacheStore<ExtraInfo>('steam_extra_info_v2')

const installInfoStore = new CacheStore<SteamInstallInfo>('steam_install_info')

export {
  configStore,
  installedGamesStore,
  libraryStore,
  extraInfoStore,
  installInfoStore
}
