import { ipcMain } from 'electron'
import {
  addToQueue,
  clearFinished,
  getQueueInformation,
  removeFromQueue
} from './downloadqueue'

ipcMain.on('addToDMQueue', (e, element) => {
  addToQueue(element)
})

ipcMain.on('removeFromDMQueue', (e, appName) => {
  removeFromQueue(appName)
})

ipcMain.handle('getDMQueueInformation', getQueueInformation)

ipcMain.on('clearDMFinished', clearFinished)
