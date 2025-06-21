import { addListener, addHandler } from 'backend/ipc'
import { existsSync, readFileSync } from 'graceful-fs'

import { showItemInFolder } from '../utils'

import { logInfo, logError, LogPrefix } from '.'
import { getLogFilePath } from './paths'
import {
  uploadLogFile,
  deleteUploadedLogFile,
  getUploadedLogFiles
} from './uploader'

addListener('logInfo', (e, message) => logInfo(message, LogPrefix.Frontend))
addListener('logError', (e, message) => logError(message, LogPrefix.Frontend))

addHandler('getLogContent', (event, appNameOrRunner) => {
  const logPath = getLogFilePath(appNameOrRunner)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

addListener('showLogFileInFolder', (e, args) =>
  showItemInFolder(getLogFilePath(args))
)

addHandler('uploadLogFile', async (e, name, args) => uploadLogFile(name, args))
addHandler('deleteUploadedLogFile', async (e, url) =>
  deleteUploadedLogFile(url)
)
addHandler('getUploadedLogFiles', async () => getUploadedLogFiles())
