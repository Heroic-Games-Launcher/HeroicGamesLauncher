import { clipboard, ipcMain } from 'electron'
import { callAbortController } from './aborthandler/aborthandler'
import {
  getGogdlVersion,
  getLegendaryVersion,
  getNileVersion
} from './helperBinaries'
import { formatSystemInfo, getSystemInfo } from './systeminfo'

ipcMain.on('abort', async (event, id) => {
  callAbortController(id)
})
ipcMain.handle('getLegendaryVersion', getLegendaryVersion)
ipcMain.handle('getGogdlVersion', getGogdlVersion)
ipcMain.handle('getNileVersion', getNileVersion)
ipcMain.handle('getSystemInfo', async (e, cache) => getSystemInfo(cache))
ipcMain.on('copySystemInfoToClipboard', async () =>
  getSystemInfo().then(formatSystemInfo).then(clipboard.writeText)
)
