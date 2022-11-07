import { ipcMain } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

ipcMain.handle('getLogContent', (event, args) => {
  const logPath = getLogFile(args)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

ipcMain.on('showLogFileInFolder', async (e, args) =>
  showItemInFolder(getLogFile(args))
)
