import { ipcMain } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

ipcMain.handle('getLogContent', async (event, { appName, defaultLast }) => {
  const logPath = getLogFile({ appName, defaultLast })
  if (existsSync(logPath)) {
    return readFileSync(getLogFile({ appName, defaultLast }), {
      encoding: 'utf-8'
    })
  }
  return ''
})

ipcMain.on('showLogFileInFolder', async (e, { appName, defaultLast }) => {
  showItemInFolder(getLogFile({ appName, defaultLast }))
})
