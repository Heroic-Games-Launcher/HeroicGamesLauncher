import { TypeCheckedStoreBackend } from '../../electron_store'
import CacheStore from '../../cache'
import { CustomLibraryGameInfo } from 'common/types'

export const libraryStore = new CacheStore<CustomLibraryGameInfo[], 'games'>(
  'custom_library',
  null
)
export const installedGamesStore = new TypeCheckedStoreBackend(
  'customLibraryInstalledGamesStore',
  {
    cwd: 'custom_store',
    name: 'installed'
  }
)
