import { ipcMain } from 'electron'
import { readFileSync } from 'graceful-fs'
import { showItemInFolder } from '../utils'
import { getLogFile } from './logfile'

ipcMain.handle(
  'getLogContent',
  async (event, args: { appName: string; defaultLast?: boolean }) =>
    readFileSync(getLogFile(args), 'utf-8')
)

ipcMain.on(
  'showLogFileInFolder',
  async (e, args: { appName: string; defaultLast?: boolean }) =>
    showItemInFolder(getLogFile(args))
)
