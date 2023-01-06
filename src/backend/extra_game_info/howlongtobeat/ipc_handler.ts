import { ipcMain } from 'electron'
import { getHowLongToBeat } from './utils'

ipcMain.handle('getHowLongToBeat', async (e, title) => getHowLongToBeat(title))
