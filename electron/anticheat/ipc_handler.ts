import { ipcMain } from 'electron'
import { gameAnticheatInfo } from './utils'

ipcMain.handle('getAnticheatInfo', async (_, appTitle) => {
  return gameAnticheatInfo(appTitle)
})
