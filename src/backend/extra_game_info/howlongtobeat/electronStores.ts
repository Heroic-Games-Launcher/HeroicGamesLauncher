import { TypeCheckedStoreBackend } from '../../electron_store'

export const howLongToBeatStore = new TypeCheckedStoreBackend('howLongToBeat', {
  cwd: 'store',
  name: 'howlongtobeat',
  clearInvalidConfig: true
})
