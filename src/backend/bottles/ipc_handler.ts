import { ipcMain } from 'electron'
import { getBottlesNames } from './utils'

ipcMain.handle('bottles.getBottlesNames', async (event, bottlesBin) => {
  return getBottlesNames(bottlesBin)
})
