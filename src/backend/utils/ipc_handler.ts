import si from 'systeminformation'
import { ipcMain } from 'electron'
import { callAbortController } from './aborthandler/aborthandler'

ipcMain.on('abort', async (event, id) => {
  callAbortController(id)
})

ipcMain.handle('getOSInfo', async () => si.osInfo())
