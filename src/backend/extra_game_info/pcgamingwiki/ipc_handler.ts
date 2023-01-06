import { ipcMain } from 'electron'
import { getInfoFromPCGamingWiki } from './utils'

ipcMain.handle('getInfoFromPCGamingWiki', async (e, title, id?) =>
  getInfoFromPCGamingWiki(title, id)
)
