import { addListener, addHandler } from 'common/ipc/backend'
import { existsSync, readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

addHandler('getLogContent', (event, appNameOrRunner) => {
  const logPath = getLogFile(appNameOrRunner)
  return existsSync(logPath) ? readFileSync(logPath, 'utf-8') : ''
})

addListener('showLogFileInFolder', async (e, appNameOrRunner) =>
  showItemInFolder(getLogFile(appNameOrRunner))
)
