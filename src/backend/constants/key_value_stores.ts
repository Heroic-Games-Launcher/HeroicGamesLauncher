import { TypeCheckedStoreBackend } from '../electron_store'

export const configStore = new TypeCheckedStoreBackend('configStore', {
  cwd: 'store'
})

export const tsStore = new TypeCheckedStoreBackend('timestampStore', {
  cwd: 'store',
  name: 'timestamp'
})
