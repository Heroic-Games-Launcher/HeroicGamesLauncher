import { clipboard, ipcMain } from 'electron'
import { callAbortController } from './aborthandler/aborthandler'
import {
  getCometVersion,
  getGogdlVersion,
  getLegendaryVersion,
  getNileVersion
} from './helperBinaries'
import { hasExecutable } from './os/path'
import { formatSystemInfo, getSystemInfo } from './systeminfo'

ipcMain.on('abort', async (event, id) => {
  callAbortController(id)
})
ipcMain.handle('getLegendaryVersion', getLegendaryVersion)
ipcMain.handle('getGogdlVersion', getGogdlVersion)
ipcMain.handle('getCometVersion', getCometVersion)
ipcMain.handle('getNileVersion', getNileVersion)
ipcMain.handle('getSystemInfo', async (e, cache) => getSystemInfo(cache))
ipcMain.on('copySystemInfoToClipboard', async () =>
  getSystemInfo().then(formatSystemInfo).then(clipboard.writeText)
)
ipcMain.handle('hasExecutable', async (event, executable) => {
  return hasExecutable(executable)
})
