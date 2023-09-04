import si from 'systeminformation'
import { ipcMain } from 'electron'
import { callAbortController } from './aborthandler/aborthandler'
import {
  getGogdlVersion,
  getLegendaryVersion,
  getNileVersion
} from './helperBinaries'

ipcMain.on('abort', async (event, id) => {
  callAbortController(id)
})
ipcMain.handle('getLegendaryVersion', getLegendaryVersion)
ipcMain.handle('getGogdlVersion', getGogdlVersion)
ipcMain.handle('getNileVersion', getNileVersion)

ipcMain.handle('getOSInfo', async () => si.osInfo())
