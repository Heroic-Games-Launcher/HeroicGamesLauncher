import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GameInfo } from 'common/types'

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

export { configStore, installedGamesStore, libraryStore }
