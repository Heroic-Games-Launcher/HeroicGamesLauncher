import { TypeCheckedStoreBackend } from '../electron_store'

const installStore = new TypeCheckedStoreBackend('legendaryInstallInfo', {
  cwd: 'lib-cache',
  name: 'installInfo',
  clearInvalidConfig: true
})
const libraryStore = new TypeCheckedStoreBackend('legendaryLibrary', {
  cwd: 'lib-cache',
  name: 'library',
  clearInvalidConfig: true
})

const gameInfoStore = new TypeCheckedStoreBackend('legendaryGameInfo', {
  cwd: 'lib-cache',
  name: 'gameinfo',
  clearInvalidConfig: true
})

export { gameInfoStore, installStore, libraryStore }
