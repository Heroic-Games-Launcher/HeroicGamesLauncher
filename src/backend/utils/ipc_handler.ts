import { ipcMain } from 'electron'
import { callAbortController } from './abort/abort'

ipcMain.on('abort', async (event, id) => {
  callAbortController(id)
})
