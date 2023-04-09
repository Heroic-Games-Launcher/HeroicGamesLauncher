import { TypeCheckedStoreBackend } from '../../electron_store'

export const libraryStore = new TypeCheckedStoreBackend('sideloadedStore', {
  cwd: 'sideload_apps',
  name: 'library',
  clearInvalidConfig: true
})
