import CacheStore from 'backend/cache'
import { TypeCheckedStoreBackend } from 'backend/electron_store'
import { NileGameInfo } from 'common/types'
import { NileInstallInfo } from 'common/types/nile'

export const installStore = new CacheStore<NileInstallInfo>('nile_install_info')
export const libraryStore = new CacheStore<NileGameInfo[], 'library'>(
  'nile_library',
  null
)

export const configStore = new TypeCheckedStoreBackend('nileConfigStore', {
  cwd: 'nile_store'
})
