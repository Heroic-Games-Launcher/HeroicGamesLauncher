import Store from 'electron-store'

export const howLongToBeatStore = new Store({
  cwd: 'store',
  name: 'howlongtobeat',
  clearInvalidConfig: true
})
