import { ipcMain } from 'electron'
import { readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

ipcMain.handle('getLogContent', async (event, { appName, defaultLast }) => {
  return readFileSync(getLogFile({ appName, defaultLast }), {
    encoding: 'utf-8'
  })
})

ipcMain.on('showLogFileInFolder', async (e, { appName, defaultLast }) => {
  showItemInFolder(getLogFile({ appName, defaultLast }))
})
