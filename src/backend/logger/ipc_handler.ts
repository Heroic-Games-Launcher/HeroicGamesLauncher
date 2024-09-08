import { ipcMain } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'
import {
  uploadLogFile,
  deleteUploadedLogFile,
  getUploadedLogFiles
} from './uploader'

ipcMain.handle('getLogContent', (event, appNameOrRunner) => {
  const logPath = getLogFile(appNameOrRunner)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

ipcMain.on('showLogFileInFolder', async (e, appNameOrRunner) =>
  showItemInFolder(getLogFile(appNameOrRunner))
)

ipcMain.handle('uploadLogFile', async (e, name, appNameOrRunner) =>
  uploadLogFile(name, appNameOrRunner)
)
ipcMain.handle('deleteUploadedLogFile', async (e, url) =>
  deleteUploadedLogFile(url)
)
ipcMain.handle('getUploadedLogFiles', async () => getUploadedLogFiles())
