import Store from 'electron-store'

const shortcutsStore = new Store({
  cwd: 'lib-cache',
  name: 'shortcuts',
  clearInvalidConfig: true
})

export { shortcutsStore }
