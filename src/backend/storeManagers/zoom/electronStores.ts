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

export { configStore, installedGamesStore, libraryStore, installInfoStore }
