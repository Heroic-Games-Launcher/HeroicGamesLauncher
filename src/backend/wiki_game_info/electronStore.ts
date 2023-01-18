import Store from 'electron-store'

export const wikiGameInfoStore = new Store({
  cwd: 'store',
  name: 'wikigameinfo',
  clearInvalidConfig: true
})
