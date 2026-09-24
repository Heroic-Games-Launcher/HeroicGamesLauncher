import { TypeCheckedStoreBackend } from '../../electron_store'
import { sideloadAppsStorePath } from 'backend/constants/key_value_stores'

export const libraryStore = new TypeCheckedStoreBackend('sideloadedStore', {
  cwd: sideloadAppsStorePath,
  name: 'library',
  clearInvalidConfig: true
})
