import Store from 'electron-store'

export const libraryStore = new Store({
  cwd: 'sideload_apps',
  name: 'library',
  clearInvalidConfig: true
})
