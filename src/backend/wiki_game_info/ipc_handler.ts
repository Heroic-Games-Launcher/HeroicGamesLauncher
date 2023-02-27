import { ipcMain } from 'electron'
import { getWikiGameInfo } from './wiki_game_info'

ipcMain.handle('getWikiGameInfo', async (e, title, id?) =>
  getWikiGameInfo(title, id)
)
