import { ipcMain } from 'electron'
import {
  addToQueue,
  getQueueInformation,
  removeFromQueue
} from './downloadqueue'

ipcMain.handle('addToDMQueue', async (e, element) => {
  await addToQueue(element)
})

ipcMain.on('removeFromDMQueue', (e, appName) => {
  removeFromQueue(appName)
})

ipcMain.handle('getDMQueueInformation', getQueueInformation)
