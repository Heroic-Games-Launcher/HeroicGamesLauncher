import { logError, logInfo, LogPrefix } from '../logger/logger'
import { getFileSize, getGame } from '../utils'
import Store from 'electron-store'
import { DMQueueElement } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'
import { sendFrontendMessage } from '../main_window'

const downloadManager = new Store({
  cwd: 'store',
  name: 'download-manager'
})

/* 
#### Private ####
*/

type DownloadManagerState = 'idle' | 'running'
type DMStatus = 'done' | 'error' | 'abort'
let queueState: DownloadManagerState = 'idle'

function getFirstQueueElement() {
  if (downloadManager.has('queue')) {
    const elements = downloadManager.get('queue') as DMQueueElement[]
    return elements.at(0)
  }

  return null
}

function addToFinished(element: DMQueueElement, status: DMStatus) {
  let elements: DMQueueElement[] = []
  if (downloadManager.has('finished')) {
    elements = downloadManager.get('finished') as DMQueueElement[]
  }

  const elementIndex = elements.findIndex(
    (el) => el.params.appName === element.params.appName
  )

  if (elementIndex >= 0) {
    elements[elementIndex] = { ...element, status: status ?? 'abort' }
  } else {
    elements.push({ ...element, status })
  }

  downloadManager.set('finished', elements)
  logInfo(
    [element.params.appName, 'added to download manager finished.'],
    LogPrefix.DownloadManager
  )
}

/* 
#### Public ####
*/

async function initQueue() {
  let element = getFirstQueueElement()
  queueState = element ? 'running' : 'idle'

  while (element) {
    const queuedElements = downloadManager.get('queue') as DMQueueElement[]
    sendFrontendMessage('changedDMQueueInformation', queuedElements)
    const game = getGame(element.params.appName, element.params.runner)
    const installInfo = await game.getInstallInfo(
      element.params.platformToInstall
    )
    element.params.size = installInfo?.manifest?.download_size
      ? getFileSize(installInfo?.manifest?.download_size)
      : '?? MB'
    element.startTime = Date.now()
    queuedElements[0] = element
    downloadManager.set('queue', queuedElements)

    const { status } =
      element.type === 'install'
        ? await installQueueElement(element.params)
        : await updateQueueElement(element.params)
    element.endTime = Date.now()
    addToFinished(element, status)
    removeFromQueue(element.params.appName)
    element = getFirstQueueElement()
  }
  queueState = 'idle'
}

function addToQueue(element: DMQueueElement) {
  if (!element) {
    logError(
      'Can not add undefined element to queue!',
      LogPrefix.DownloadManager
    )
    return
  }

  sendFrontendMessage('gameStatusUpdate', {
    appName: element.params.appName,
    runner: element.params.runner,
    folder: element.params.path,
    status: 'queued'
  })

  let elements: DMQueueElement[] = []
  if (downloadManager.has('queue')) {
    elements = downloadManager.get('queue') as DMQueueElement[]
  }

  const elementIndex = elements.findIndex(
    (el) => el.params.appName === element.params.appName
  )

  if (elementIndex >= 0) {
    elements[elementIndex] = element
  } else {
    elements.push(element)
  }

  downloadManager.set('queue', elements)
  logInfo(
    [element.params.gameInfo.title, ' was added to the download queue.'],
    LogPrefix.DownloadManager
  )

  sendFrontendMessage('changedDMQueueInformation', elements)

  if (queueState === 'idle') {
    initQueue()
  }
}

function removeFromQueue(appName: string) {
  if (appName && downloadManager.has('queue')) {
    let elements: DMQueueElement[] = []
    elements = downloadManager.get('queue') as DMQueueElement[]
    const index = elements.findIndex(
      (queueElement) => queueElement?.params.appName === appName
    )
    if (index !== -1) {
      elements.splice(index, 1)
      downloadManager.delete('queue')
      downloadManager.set('queue', elements)
    }

    sendFrontendMessage('gameStatusUpdate', {
      appName,
      status: 'done'
    })

    logInfo(
      [appName, 'removed from download manager.'],
      LogPrefix.DownloadManager
    )

    sendFrontendMessage('changedDMQueueInformation', elements)
  }
}

function clearFinished() {
  if (downloadManager.has('finished')) {
    downloadManager.delete('finished')
  }
}

function getQueueInformation() {
  let elements: DMQueueElement[] = []
  let finished: DMQueueElement[] = []
  if (downloadManager.has('queue')) {
    elements = downloadManager.get('queue') as DMQueueElement[]
    finished = downloadManager.get('finished') as DMQueueElement[]
  }

  return { elements, finished }
}

export {
  initQueue,
  addToQueue,
  removeFromQueue,
  clearFinished,
  getQueueInformation
}
