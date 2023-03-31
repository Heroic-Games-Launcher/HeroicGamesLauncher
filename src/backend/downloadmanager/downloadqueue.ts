import { TypeCheckedStoreBackend } from './../electron_store'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { getFileSize, getGame } from '../utils'
import { DMQueueElement, DMStatus, DownloadManagerState } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'
import { sendFrontendMessage } from '../main_window'
import { callAbortController } from 'backend/utils/aborthandler/aborthandler'
import { removeFolder } from 'backend/main'
import { notify } from '../dialog/dialog'
import i18next from 'i18next'

const downloadManager = new TypeCheckedStoreBackend('downloadManager', {
  cwd: 'store',
  name: 'download-manager'
})

/*
#### Private ####
*/

let queueState: DownloadManagerState = 'idle'
let currentElement: DMQueueElement | null = null

function getFirstQueueElement() {
  const elements = downloadManager.get('queue', [])
  return elements.at(0) ?? null
}

function isPaused(): boolean {
  return queueState === 'paused'
}

function isIdle(): boolean {
  return queueState === 'idle' || !currentElement
}

function isRunning(): boolean {
  return queueState === 'running'
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

  while (element) {
    const queuedElements = downloadManager.get('queue', [])
    element.startTime = Date.now()
    queuedElements[0] = element
    downloadManager.set('queue', queuedElements)

    currentElement = element

    queueState = 'running'
    sendFrontendMessage('changedDMQueueInformation', queuedElements, queueState)

    const { status } =
      element.type === 'install'
        ? await installQueueElement(element.params)
        : await updateQueueElement(element.params)
    element.endTime = Date.now()

    processNotification(element, status)

    if (!isPaused()) {
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

  sendFrontendMessage('changedDMQueueInformation', elements, queueState)

  if (isIdle()) {
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

    sendFrontendMessage('changedDMQueueInformation', elements, queueState)
  }
}

function getQueueInformation() {
  const elements = downloadManager.get('queue', [])
  const finished = downloadManager.get('finished', [])

  return { elements, finished, state: queueState }
}

function cancelCurrentDownload({ removeDownloaded = false }) {
  if (currentElement) {
    if (isRunning()) {
      stopCurrentDownload()
    }
    removeFromQueue(currentElement.params.appName)

    if (removeDownloaded) {
      const { appName, runner } = currentElement!.params
      const { folder_name } = getGame(appName, runner).getGameInfo()
      removeFolder(currentElement.params.path, folder_name)
    }
    currentElement = null
  }
}

function pauseCurrentDownload() {
  if (currentElement) {
    stopCurrentDownload()
  }
  queueState = 'paused'
  sendFrontendMessage(
    'changedDMQueueInformation',
    downloadManager.get('queue', []),
    queueState
  )
}

function resumeCurrentDownload() {
  initQueue()
}

function stopCurrentDownload() {
  const { appName, runner } = currentElement!.params
  callAbortController(appName)
  getGame(appName, runner).stop(false)
}

// notify the user based on the status of the element and the status of the queue
function processNotification(element: DMQueueElement, status: DMStatus) {
  const action = element.type === 'install' ? 'Installation' : 'Update'
  const game = getGame(element.params.appName, element.params.runner)
  const { title } = game.getGameInfo()

  if (status === 'abort') {
    if (isPaused()) {
      logWarning(
        [action, 'of', element.params.appName, 'paused!'],
        LogPrefix.DownloadManager
      )
      // i18next.t('notify.update.paused', 'Update Paused')
      // i18next.t('notify.install.paused', 'Installation Paused')
      notify({ title, body: i18next.t(`notify.${element.type}.paused`) })
    } else {
      logWarning(
        [action, 'of', element.params.appName, 'aborted!'],
        LogPrefix.DownloadManager
      )
      // i18next.t('notify.update.canceled', 'Update Canceled')
      // i18next.t('notify.install.canceled', 'Installation Canceled')
      notify({ title, body: i18next.t(`notify.${element.type}.canceled`) })
    }
  } else if (status === 'error') {
    logWarning(
      [action, 'of', element.params.appName, 'failed!'],
      LogPrefix.DownloadManager
    )
    // i18next.t('notify.update.failed', 'Update Failed')
    // i18next.t('notify.install.failed', 'Installation Failed')
    notify({ title, body: i18next.t(`notify.${element.type}.failed`) })
  } else if (status === 'done') {
    // i18next.t('notify.update.finished', 'Update Finished')
    // i18next.t('notify.install.finished', 'Installation Finished')
    notify({
      title,
      body: i18next.t(`notify.${element.type}.finished`)
    })

    logInfo(
      ['Finished', action, 'of', element.params.appName],
      LogPrefix.DownloadManager
    )
  }
}

export {
  initQueue,
  addToQueue,
  removeFromQueue,
  getQueueInformation,
  cancelCurrentDownload,
  pauseCurrentDownload,
  resumeCurrentDownload
}
