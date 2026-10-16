import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { GameInfo } from 'common/types'
import { ZoomInstallInfo } from 'common/types/zoom'
import { zoomStorePath } from 'backend/constants/key_value_stores'

const installedGamesStore = new TypeCheckedStoreBackend(
  'zoomInstalledGamesStore',
  {
    cwd: zoomStorePath,
    name: 'installed'
  }
)

const configStore = new TypeCheckedStoreBackend('zoomConfigStore', {
  cwd: zoomStorePath
})

const libraryStore = new CacheStore<GameInfo[], 'games'>('zoom_library', null)

const installInfoStore = new CacheStore<ZoomInstallInfo>('zoom_install_info')

export { configStore, installedGamesStore, libraryStore, installInfoStore }
