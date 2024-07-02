import { addListener, addHandler } from 'common/ipc/backend'
import {
  addToQueue,
  cancelCurrentDownload,
  getQueueInformation,
  pauseCurrentDownload,
  removeFromQueue,
  resumeCurrentDownload
} from './downloadqueue'

addHandler('addToDMQueue', async (e, element) => {
  await addToQueue(element)
})

addListener('removeFromDMQueue', (e, appName) => {
  removeFromQueue(appName)
})

addListener('resumeCurrentDownload', () => {
  resumeCurrentDownload()
})

addListener('pauseCurrentDownload', () => {
  pauseCurrentDownload()
})

addListener('cancelDownload', (e, removeDownloaded) => {
  cancelCurrentDownload({ removeDownloaded })
})

addHandler('getDMQueueInformation', getQueueInformation)
