import { addListener, addHandler } from 'backend/ipc'
import { existsSync, readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'
import {
  uploadLogFile,
  deleteUploadedLogFile,
  getUploadedLogFiles
} from './uploader'

addHandler('getLogContent', (event, appNameOrRunner) => {
  const logPath = getLogFile(appNameOrRunner)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

addListener('showLogFileInFolder', async (e, appNameOrRunner) =>
  showItemInFolder(getLogFile(appNameOrRunner))
)

addHandler('uploadLogFile', async (e, name, appNameOrRunner) =>
  uploadLogFile(name, appNameOrRunner)
)
addHandler('deleteUploadedLogFile', async (e, url) =>
  deleteUploadedLogFile(url)
)
addHandler('getUploadedLogFiles', async () => getUploadedLogFiles())
