import Store from 'electron-store'

const installStore = new Store({
  cwd: 'lib-cache',
  name: 'installInfo',
  clearInvalidConfig: true
})
const libraryStore = new Store({
  cwd: 'lib-cache',
  name: 'library',
  clearInvalidConfig: true
})

const gameInfoStore = new Store({
  cwd: 'lib-cache',
  name: 'gameinfo',
  clearInvalidConfig: true
})

export { gameInfoStore, installStore, libraryStore }
