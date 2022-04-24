import Store from 'electron-store'

const installStore = new Store({
  cwd: 'lib-cache',
  name: 'installInfo'
})
const libraryStore = new Store({
  cwd: 'lib-cache',
  name: 'library'
})

const gameInfoStore = new Store({
  cwd: 'lib-cache',
  name: 'gameinfo'
})

export { gameInfoStore, installStore, libraryStore }
