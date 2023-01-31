import { TypeCheckedStoreBackend } from '../electron_store'

export const wikiGameInfoStore = new TypeCheckedStoreBackend('wikigameinfo', {
  cwd: 'store',
  clearInvalidConfig: true
})
