import { DMQueueElement } from 'common/types'
import { ipcMain } from 'electron'
import {
  addToQueue,
  clearFinished,
  getQueueInformation,
  removeFromQueue
} from './downloadqueue'

ipcMain.on('addToDMQueue', (e, element: DMQueueElement) => {
  addToQueue(element)
})

ipcMain.on('removeFromDMQueue', (e, appName: string) => {
  removeFromQueue(appName)
})

ipcMain.handle('getDMQueueInformation', () => {
  return getQueueInformation()
})

ipcMain.on('clearDMFinished', () => {
  clearFinished()
})
