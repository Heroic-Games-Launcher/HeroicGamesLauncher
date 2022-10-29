import { ipcMain } from 'electron'
import { readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

ipcMain.handle('getLogContent', (event, args) =>
  readFileSync(getLogFile(args), 'utf-8')
)

ipcMain.on('showLogFileInFolder', async (e, args) =>
  showItemInFolder(getLogFile(args))
)
