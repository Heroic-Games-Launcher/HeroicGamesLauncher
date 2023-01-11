import { TypeCheckedStoreBackend } from '../../electron_store'

export const pcGamingWikiInfoStore = new TypeCheckedStoreBackend(
  'pcGamingWikiInfo',
  {
    cwd: 'store',
    name: 'pcgamingwikiinfo',
    clearInvalidConfig: true
  }
)
