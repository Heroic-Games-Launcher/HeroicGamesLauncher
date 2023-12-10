import { ipcMain } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

ipcMain.handle('getLogContent', (event, appNameOrRunner) => {
  const logPath = getLogFile(appNameOrRunner)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

ipcMain.on('showLogFileInFolder', async (e, appNameOrRunner) =>
  showItemInFolder(getLogFile(appNameOrRunner))
)
