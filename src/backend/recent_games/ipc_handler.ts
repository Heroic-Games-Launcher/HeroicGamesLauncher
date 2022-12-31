import { ipcMain } from 'electron'
import { removeRecentGame } from './recent_games'

ipcMain.handle('removeRecent', async (_event, appName) =>
  removeRecentGame(appName)
)
