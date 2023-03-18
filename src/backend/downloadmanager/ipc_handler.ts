import { ipcMain } from 'electron'
import {
  addToQueue,
  cancelCurrentDownload,
  getQueueInformation,
  pauseCurrentDownload,
  removeFromQueue,
  startDownloading
} from './downloadqueue'

ipcMain.handle('addToDMQueue', async (e, element) => {
  await addToQueue(element)
})

ipcMain.on('removeFromDMQueue', (e, appName) => {
  removeFromQueue(appName)
})

ipcMain.on('startDownloading', () => {
  startDownloading()
})

ipcMain.on('pauseCurrentDownload', () => {
  pauseCurrentDownload()
})

ipcMain.on('cancelDownload', (e, removeDownloaded) => {
  cancelCurrentDownload({ removeDownloaded })
})

ipcMain.handle('getDMQueueInformation', getQueueInformation)
