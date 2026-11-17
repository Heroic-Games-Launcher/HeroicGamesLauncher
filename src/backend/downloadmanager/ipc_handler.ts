import { addHandler, addListener } from '../ipc'
import {
  addToQueue,
  cancelCurrentDownload,
  cancelQueuedDownload,
  getQueueInformation,
  pauseCurrentDownload,
  removeFromQueue,
  resumeCurrentDownload
} from './downloadqueue'

import type { DMQueueElement } from 'common/types'

addHandler('install', async (_e, args) => {
  const dmQueueElement: DMQueueElement = {
    params: args,
    type: 'install',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  await addToQueue(dmQueueElement, { userStarted: true })

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

addHandler('updateGame', async (_e, args) => {
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

  await addToQueue(dmQueueElement, { userStarted: true })
})

addListener('removeFromDMQueue', (e, appName) => removeFromQueue(appName))
addListener('resumeCurrentDownload', () => void resumeCurrentDownload())
addListener('pauseCurrentDownload', () => pauseCurrentDownload())
addListener('cancelDownload', (e, removeDownloaded) =>
  cancelCurrentDownload({ removeDownloaded })
)
addListener('cancelQueuedDownload', (e, appName, removeDownloaded) =>
  cancelQueuedDownload(appName, removeDownloaded)
)
addHandler('getDMQueueInformation', getQueueInformation)
