import { ipcMain } from 'electron'
import { getWikiGameInfo } from './wiki_game_info'

ipcMain.handle('getWikiGameInfo', async (e, title, appName, runner) =>
  getWikiGameInfo(title, appName, runner)
)
