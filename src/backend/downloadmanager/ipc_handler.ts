import { ipcMain } from 'electron'
import {
  addToQueue,
  cancelCurrentDownload,
  getQueueInformation,
  pauseCurrentDownload,
  removeFromQueue,
  resumeCurrentDownload
} from './downloadqueue'

import type { DMQueueElement } from 'common/types'

ipcMain.handle('install', async (_e, args) => {
  const dmQueueElement: DMQueueElement = {
    params: args,
    type: 'install',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  await addToQueue(dmQueueElement)

  // Add Dlcs to the queue
  if (
    Array.isArray(args.installDlcs) &&
    args.installDlcs.length > 0 &&
    args.runner === 'legendary'
  ) {
    for (const dlc of args.installDlcs) {
      const dlcQueueElement: DMQueueElement = {
        params: {
          ...args,
          appName: dlc
        },
        type: 'install',
        addToQueueTime: Date.now(),
        endTime: 0,
        startTime: 0
      }
      await addToQueue(dlcQueueElement)
    }
  }
})

ipcMain.handle('updateGame', async (_e, args) => {
  const {
    gameInfo: {
      install: { platform, install_path }
    }
  } = args

  const dmQueueElement: DMQueueElement = {
    params: { ...args, path: install_path!, platformToInstall: platform! },
    type: 'update',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  await addToQueue(dmQueueElement)
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
