import { ipcMain } from 'electron'
import {
  addToQueue,
  cancelCurrentDownload,
  getAutoShutdown,
  getQueueInformation,
  pauseCurrentDownload,
  removeFromQueue,
  resumeCurrentDownload,
  setAutoShutdown
} from './downloadqueue'

ipcMain.handle('addToDMQueue', async (e, element) => {
  await addToQueue(element)
})

ipcMain.on('setAutoShutdown', (e, value: boolean) => {
  setAutoShutdown(value)
})

ipcMain.on('removeFromDMQueue', (e, appName) => {
  removeFromQueue(appName)
})

ipcMain.on('resumeCurrentDownload', () => {
  resumeCurrentDownload()
})

ipcMain.on('pauseCurrentDownload', () => {
  pauseCurrentDownload()
})

ipcMain.on('cancelDownload', (e, removeDownloaded) => {
  cancelCurrentDownload({ removeDownloaded })
})

ipcMain.handle('getDMQueueInformation', getQueueInformation)

ipcMain.handle('getAutoShutdownValue', getAutoShutdown)
