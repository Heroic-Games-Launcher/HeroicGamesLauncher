import { ipcMain } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'

import { showItemInFolder } from '../utils'

import { logInfo, logError, LogPrefix } from '.'
import { getLogFilePath } from './paths'
import {
  uploadLogFile,
  deleteUploadedLogFile,
  getUploadedLogFiles
} from './uploader'

ipcMain.on('logInfo', (e, message) => logInfo(message, LogPrefix.Frontend))
ipcMain.on('logError', (e, message) => logError(message, LogPrefix.Frontend))

ipcMain.handle('getLogContent', (event, args) => {
  const logPath = getLogFilePath(args)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

ipcMain.on('showLogFileInFolder', (e, args) =>
  showItemInFolder(getLogFilePath(args))
)

ipcMain.handle('uploadLogFile', async (e, name, args) =>
  uploadLogFile(name, args)
)
ipcMain.handle('deleteUploadedLogFile', async (e, url) =>
  deleteUploadedLogFile(url)
)
ipcMain.handle('getUploadedLogFiles', async () => getUploadedLogFiles())
