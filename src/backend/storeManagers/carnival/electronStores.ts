import CacheStore from 'backend/cache'
import { TypeCheckedStoreBackend } from 'backend/electron_store'
import { GameInfo } from 'common/types'
import { CarnivalInstallInfo } from 'common/types/carnival'

export const installStore = new CacheStore<CarnivalInstallInfo>('carnival_install_info')
export const libraryStore = new CacheStore<GameInfo[], 'library'>(
  'carnival_library',
  null
)

export const configStore = new TypeCheckedStoreBackend('carnivalConfigStore', {
  cwd: 'carnival_store'
})
