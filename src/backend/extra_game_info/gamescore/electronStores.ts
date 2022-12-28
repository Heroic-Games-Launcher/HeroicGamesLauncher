import Store from 'electron-store'

export const gameScoreStore = new Store({
  cwd: 'store',
  name: 'gamescore',
  clearInvalidConfig: true
})
