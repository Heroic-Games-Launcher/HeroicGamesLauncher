import { ipcMain } from 'electron'
import { getGameScore } from './utils'

ipcMain.handle('getGameScore', async (e, title) => getGameScore(title))
