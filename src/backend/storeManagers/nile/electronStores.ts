import CacheStore from 'backend/cache'
import { GameInfo } from 'common/types'
import { NileInstallInfo } from 'common/types/nile'

export const installStore = new CacheStore<NileInstallInfo>('nile_install_info')
export const libraryStore = new CacheStore<GameInfo[], 'library'>(
  'nile_library',
  null
)
