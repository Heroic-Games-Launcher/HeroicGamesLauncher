import { TypeCheckedStoreBackend } from './../electron_store'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { getFileSize, getGame } from '../utils'
import { DMQueueElement, DownloadManagerState } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'
import { sendFrontendMessage } from '../main_window'
import { callAbortController } from 'backend/utils/aborthandler/aborthandler'

const downloadManager = new TypeCheckedStoreBackend('downloadManager', {
  cwd: 'store',
  name: 'download-manager'
})

/*
#### Private ####
*/

type DMStatus = 'done' | 'error' | 'abort'
let queueState: DownloadManagerState = 'idle'
let currentElement: DMQueueElement | null = null

function getFirstQueueElement() {
  const elements = downloadManager.get('queue', [])
  return elements.at(0) ?? null
}

function addToFinished(element: DMQueueElement, status: DMStatus) {
  const elements = downloadManager.get('finished', [])

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
    const queuedElements = downloadManager.get('queue', [])
    sendFrontendMessage('changedDMQueueInformation', queuedElements)
    element.startTime = Date.now()
    queuedElements[0] = element
    downloadManager.set('queue', queuedElements)

    currentElement = element

    const { status } =
      element.type === 'install'
        ? await installQueueElement(element.params)
        : await updateQueueElement(element.params)
    element.endTime = Date.now()
    if (queueState === 'running') {
      addToFinished(element, status)
      removeFromQueue(element.params.appName)
      element = getFirstQueueElement()
    } else {
      element = null
    }
  }
}

async function addToQueue(element: DMQueueElement) {
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

  const elements = downloadManager.get('queue', [])

  const elementIndex = elements.findIndex(
    (el) => el.params.appName === element.params.appName
  )

  if (elementIndex >= 0) {
    elements[elementIndex] = element
  } else {
    const game = getGame(element.params.appName, element.params.runner)
    const installInfo = await game.getInstallInfo(
      element.params.platformToInstall
    )

    element.params.size = installInfo?.manifest?.download_size
      ? getFileSize(installInfo?.manifest?.download_size)
      : '?? MB'
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
    const elements = downloadManager.get('queue', [])
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

function getQueueInformation() {
  const elements = downloadManager.get('queue', [])
  const finished = downloadManager.get('finished', [])

  return { elements, finished, state: queueState }
}

function cancelCurrentDownload({ removeDownloaded = false }) {
  if (currentElement) {
    callAbortController(currentElement.params.appName)
    if (removeDownloaded) {
      console.log('should remove downloaded data')
      // window.api.removeFolder([currentElement.params.path, currentElement.params.folderName])
    }
  }
}

function pauseCurrentDownload() {
  if (currentElement) {
    callAbortController(currentElement.params.appName)
  }
  queueState = 'paused'
}

function startDownloading() {
  initQueue()
}

export {
  initQueue,
  addToQueue,
  removeFromQueue,
  getQueueInformation,
  cancelCurrentDownload,
  pauseCurrentDownload,
  startDownloading
}
