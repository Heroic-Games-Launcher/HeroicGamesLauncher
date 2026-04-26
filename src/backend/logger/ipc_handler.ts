import { addListener, addHandler } from 'backend/ipc'
import { existsSync } from 'graceful-fs'

import { showItemInFolder } from '../utils'

import { logInfo, logError, LogPrefix } from '.'
import { getLogFilePath } from './paths'
import {
  uploadLogFile,
  deleteUploadedLogFile,
  getUploadedLogFiles
} from './uploader'
import { readLastBytes } from 'backend/utils/filesystem/read_last_bytes'
import { decodeUTF8 } from 'backend/utils/strings'

addListener('logInfo', (e, message) => logInfo(message, LogPrefix.Frontend))
addListener('logError', (e, message) => logError(message, LogPrefix.Frontend))

addHandler('getLogContent', async (event, appNameOrRunner) => {
  const logPath = getLogFilePath(appNameOrRunner)
  const MAX_LOG_BYTES = 1024 * 1024 // 1 MB
  if (existsSync(logPath)) {
    const buffer = await readLastBytes(logPath, MAX_LOG_BYTES)
    return decodeUTF8(buffer)
  }
  return ''
})

addListener('showLogFileInFolder', (e, args) =>
  showItemInFolder(getLogFilePath(args))
)

addHandler('uploadLogFile', async (e, name, args) => uploadLogFile(name, args))
addHandler('deleteUploadedLogFile', async (e, url) =>
  deleteUploadedLogFile(url)
)
addHandler('getUploadedLogFiles', async () => getUploadedLogFiles())
