import Store from 'electron-store'

export const libraryStore = new Store({
  cwd: 'gog_store',
  name: 'library',
  clearInvalidConfig: true
})
