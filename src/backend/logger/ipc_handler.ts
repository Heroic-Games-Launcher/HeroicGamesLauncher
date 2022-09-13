import { ipcMain } from 'electron'
import { readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logger'

ipcMain.handle(
  'getLogContent',
  async (event, { isDefault, appName, defaultLast = false }) => {
    return readFileSync(getLogFile(isDefault, appName, defaultLast), {
      encoding: 'utf-8'
    })
  }
)

ipcMain.on(
  'showLogFileInFolder',
  async (e, { isDefault, appName, defaultLast = false }) => {
    showItemInFolder(getLogFile(isDefault, appName, defaultLast))
  }
)
