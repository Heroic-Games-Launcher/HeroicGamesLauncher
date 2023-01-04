import Store from 'electron-store'

export const appleGamingWikiInfoStore = new Store({
  cwd: 'store',
  name: 'applegamingwikiinfo',
  clearInvalidConfig: true
})
