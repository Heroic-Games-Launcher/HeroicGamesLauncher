import Store from 'electron-store'

export const pcGamingWikiInfoStore = new Store({
  cwd: 'store',
  name: 'pcgamingwikiinfo',
  clearInvalidConfig: true
})
