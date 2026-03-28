import { sideloadAppsStorePath } from 'backend/constants/key_value_stores'
import { TypeCheckedStoreBackend } from '../../electron_store'

export const libraryStore = new TypeCheckedStoreBackend('sideloadedStore', {
  cwd: sideloadAppsStorePath,
  name: 'library',
  clearInvalidConfig: true
})
