import { getMainWindow } from '../utils'
import { DMQueueElement } from 'common/types'
import { ipcMain } from 'electron'
import {
  addToQueue,
  getQueueInformation,
  removeFromQueue
} from './downloadqueue'

ipcMain.on('addToDMQueue', (e, element: DMQueueElement) => {
  getMainWindow().webContents.send('setGameStatus', {
    appName: element.params.appName,
    status: 'queued'
  })
  addToQueue(element)
})

ipcMain.on('removeFromDMQueue', (e, appName: string) => {
  getMainWindow().webContents.send('setGameStatus', {
    appName,
    status: 'done'
  })
  removeFromQueue(appName)
})

ipcMain.handle('getDMQueueInformation', () => {
  return getQueueInformation()
})
