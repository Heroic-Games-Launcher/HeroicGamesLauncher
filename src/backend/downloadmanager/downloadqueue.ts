import { libraryManagerMap } from 'backend/storeManagers'
import { TypeCheckedStoreBackend } from './../electron_store'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { getFileSize, removeFolder, sendGameStatusUpdate } from '../utils'
import { DMQueueElement, DMStatus, DownloadManagerState } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'
import { sendFrontendMessage } from '../ipc'
import { callAbortController } from 'backend/utils/aborthandler/aborthandler'
import { notify } from '../dialog/dialog'
import { t } from 'i18next'
import { createRedistDMQueueElement } from 'backend/storeManagers/gog/redist'
import { existsSync } from 'fs'
import { gogRedistPath } from 'backend/storeManagers/gog/constants'
import { onConnectivityChange } from 'backend/online_monitor'
import { buildCacheKey, getCachedSize, setCachedSize } from './sizeCache'

const downloadManager = new TypeCheckedStoreBackend('downloadManager', {
  cwd: 'store',
  name: 'download-manager'
})

/*
#### Private ####
*/

let queueState: DownloadManagerState = 'idle'
let currentElement: DMQueueElement | null = null
let autoPaused = false
let processingLock = false

onConnectivityChange((status) => {
  if (status === 'offline' && isRunning()) {
    logInfo('System offline, auto-pausing downloads', LogPrefix.DownloadManager)
    pauseCurrentDownload()
    autoPaused = true
  } else if (status === 'online' && autoPaused) {
    logInfo('System online, auto-resuming downloads', LogPrefix.DownloadManager)
    autoPaused = false
    void resumeCurrentDownload()
  }
})

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

async function enrichElement(
  element: DMQueueElement
): Promise<DMQueueElement[]> {
  const gameInfo = libraryManagerMap[element.params.runner].getGameInfo(
    element.params.appName
  )

  if (
    gameInfo?.isEAManaged ||
    gameInfo?.isUbisoftManaged ||
    element.params.appName === 'gog-redist'
  ) {
    element.params.size = '?? MB'
    return []
  }

  const isGOGWindows =
    element.params.runner === 'gog' &&
    element.params.platformToInstall.toLowerCase() === 'windows'

  const cacheKey = buildCacheKey(
    element.type,
    element.params.appName,
    element.params.runner,
    element.params.platformToInstall,
    element.params.installLanguage,
    element.params.sdlList,
    element.params.branch,
    element.params.build
  )

  const cachedSize = getCachedSize(cacheKey)
  if (cachedSize && !isGOGWindows) {
    element.params.size = cachedSize
    logInfo(
      [`Size cache hit for ${element.params.appName}: ${cachedSize}`],
      LogPrefix.DownloadManager
    )
    return []
  }

  try {
    const installInfo = await libraryManagerMap[
      element.params.runner
    ].getInstallInfo(element.params.appName, element.params.platformToInstall, {
      branch: element.params.branch,
      build: element.params.build
    })

    const formattedSize = installInfo?.manifest?.download_size
      ? getFileSize(installInfo.manifest.download_size)
      : '?? MB'

    element.params.size = cachedSize ?? formattedSize

    if (formattedSize !== '?? MB') {
      setCachedSize(cacheKey, formattedSize)
    }

    if (
      isGOGWindows &&
      installInfo &&
      installInfo.manifest &&
      'dependencies' in installInfo.manifest
    ) {
      const newDependencies = installInfo.manifest.dependencies || []
      if (newDependencies?.length || !existsSync(gogRedistPath)) {
        const redistElement = createRedistDMQueueElement()
        redistElement.params.dependencies = newDependencies
        return [redistElement]
      }
    }
  } catch (error) {
    logWarning(
      [`Error enriching install info for ${element.params.appName}:`, error],
      LogPrefix.DownloadManager
    )
  }

  return []
}

async function initQueue() {
  if (processingLock) return
  processingLock = true

  try {
    let element = getFirstQueueElement()

    while (element) {
      const currentProcessing = element
      let status: DMStatus = 'error'

      try {
        const extraElements = await enrichElement(currentProcessing)
        const currentQueue = downloadManager.get('queue', [])
        const currentIndex = currentQueue.findIndex(
          (el) => el.params.appName === currentProcessing.params.appName
        )

        if (currentIndex < 0) {
          element = getFirstQueueElement()
          continue
        }

        if (extraElements.length > 0) {
          currentQueue.splice(currentIndex + 1, 0, ...extraElements)
        }

        currentProcessing.startTime = Date.now()
        currentQueue[currentIndex] = currentProcessing
        downloadManager.set('queue', currentQueue)

        currentElement = currentProcessing
        queueState = 'running'
        sendFrontendMessage(
          'changedDMQueueInformation',
          currentQueue,
          queueState
        )

        const result =
          currentProcessing.type === 'install'
            ? await installQueueElement(currentProcessing.params)
            : await updateQueueElement(currentProcessing.params)
        status = result.status
      } catch (error) {
        logError(
          [`Error processing ${currentProcessing.params.appName}:`, error],
          LogPrefix.DownloadManager
        )
        status = 'error'
      }

      currentProcessing.endTime = Date.now()
      processNotification(currentProcessing, status)

      if (!isPaused()) {
        addToFinished(currentProcessing, status)
        removeFromQueue(currentProcessing.params.appName)
        element = getFirstQueueElement()
      } else {
        element = null
      }
    }
  } finally {
    currentElement = null
    if (queueState !== 'paused') {
      queueState = 'idle'
    }
    processingLock = false
  }
}

let backgroundAnalysisChain: Promise<void> = Promise.resolve()

async function analyzeElementSize(element: DMQueueElement): Promise<void> {
  const gameInfo = libraryManagerMap[element.params.runner].getGameInfo(
    element.params.appName
  )
  if (
    gameInfo?.isEAManaged ||
    gameInfo?.isUbisoftManaged ||
    element.params.appName === 'gog-redist'
  ) {
    return
  }

  const cacheKey = buildCacheKey(
    element.type,
    element.params.appName,
    element.params.runner,
    element.params.platformToInstall,
    element.params.installLanguage,
    element.params.sdlList,
    element.params.branch,
    element.params.build
  )

  const applySize = (formattedSize: string) => {
    const queue = downloadManager.get('queue', [])
    const index = queue.findIndex(
      (el) =>
        el.params.appName === element.params.appName &&
        el.params.runner === element.params.runner
    )
    if (index >= 0 && queue[index].params.size !== formattedSize) {
      queue[index].params.size = formattedSize
      downloadManager.set('queue', queue)
      sendFrontendMessage('changedDMQueueInformation', queue, queueState)
      logInfo(
        [
          `Background size analysis for ${element.params.appName}: ${formattedSize}`
        ],
        LogPrefix.DownloadManager
      )
    }
  }

  const cachedSize = getCachedSize(cacheKey)
  if (cachedSize) {
    applySize(cachedSize)
    return
  }

  try {
    const installInfo = await libraryManagerMap[
      element.params.runner
    ].getInstallInfo(element.params.appName, element.params.platformToInstall, {
      branch: element.params.branch,
      build: element.params.build
    })

    if (!installInfo?.manifest?.download_size) return

    const formattedSize = getFileSize(installInfo.manifest.download_size)
    setCachedSize(cacheKey, formattedSize)
    applySize(formattedSize)
  } catch (error) {
    logWarning(
      [`Background size analysis failed for ${element.params.appName}:`, error],
      LogPrefix.DownloadManager
    )
  }
}

function addToQueue(element: DMQueueElement): void {
  if (!element) {
    logError(
      'Can not add undefined element to queue!',
      LogPrefix.DownloadManager
    )
    return
  }

  sendGameStatusUpdate({
    appName: element.params.appName,
    runner: element.params.runner,
    folder: element.params.path,
    status: 'queued'
  })

  const elements = downloadManager.get('queue', [])

  const elementIndex = elements.findIndex(
    (el) =>
      el.params.appName === element.params.appName &&
      el.params.runner === element.params.runner
  )

  let isNewElement = false
  if (elementIndex >= 0) {
    elements[elementIndex] = element
  } else {
    const cacheKey = buildCacheKey(
      element.type,
      element.params.appName,
      element.params.runner,
      element.params.platformToInstall,
      element.params.installLanguage,
      element.params.sdlList,
      element.params.branch,
      element.params.build
    )
    const cachedSize = getCachedSize(cacheKey)
    element.params.size = cachedSize ?? element.params.size ?? '?? MB'
    elements.push(element)
    isNewElement = true
  }

  downloadManager.set('queue', elements)
  logInfo(
    [element.params.gameInfo.title, ' was added to the download queue.'],
    LogPrefix.DownloadManager
  )
  sendFrontendMessage('changedDMQueueInformation', elements, queueState)

  // `isIdle()` returns true while paused too, because the finally in initQueue
  // nulls `currentElement`. Without the `!isPaused()` guard, adding an element
  // to a paused queue would auto-start the download and silently break the
  // pause. Background size analysis below is still allowed while paused (it
  // only updates the displayed size, it never starts a download).
  const willProcessImmediately = isIdle() && !isPaused()
  if (willProcessImmediately) {
    void initQueue()
  }

  // initQueue only enriches the element it processes first (the queue head).
  // Every other new element with an unknown size needs background analysis,
  // otherwise it keeps the size it was added with until its turn comes. This
  // matters for DLCs queued right after their base game while the queue was
  // still idle: they are not the head, so initQueue won't enrich them, and
  // their size would otherwise stay inherited from the base game. The analysis
  // runs off the serialized backgroundAnalysisChain so it never blocks the
  // active download.
  const isQueueHead =
    elements[0]?.params.appName === element.params.appName &&
    elements[0]?.params.runner === element.params.runner

  if (isNewElement && !(willProcessImmediately && isQueueHead)) {
    backgroundAnalysisChain = backgroundAnalysisChain.then(() =>
      analyzeElementSize(element)
    )
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
      downloadManager.set('queue', elements)
    }

    sendGameStatusUpdate({
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
  const elementToCancel =
    currentElement ?? (isPaused() ? getFirstQueueElement() : null)

  if (elementToCancel) {
    if (Array.isArray(elementToCancel.params.installDlcs)) {
      const dlcsToRemove = elementToCancel.params.installDlcs
      for (const dlc of dlcsToRemove) {
        removeFromQueue(dlc)
      }
    }
    if (isRunning()) {
      stopCurrentDownload()
    }
    removeFromQueue(elementToCancel.params.appName)

    if (removeDownloaded) {
      const { appName, runner } = elementToCancel.params
      const { folder_name } = libraryManagerMap[runner]
        .getGame(appName)
        .getGameInfo()
      if (folder_name) {
        removeFolder(elementToCancel.params.path, folder_name)
      }
    }
    currentElement = null
  }
}

function pauseCurrentDownload() {
  if (currentElement) {
    stopCurrentDownload()
  }
  queueState = 'paused'
  autoPaused = false
  sendFrontendMessage(
    'changedDMQueueInformation',
    downloadManager.get('queue', []),
    queueState
  )
}

function resumeCurrentDownload() {
  autoPaused = false
  queueState = 'idle'
  sendFrontendMessage(
    'changedDMQueueInformation',
    downloadManager.get('queue', []),
    queueState
  )
  void initQueue()
}

function stopCurrentDownload() {
  if (!currentElement) return
  const { appName, runner } = currentElement.params
  callAbortController(appName)
  void libraryManagerMap[runner].getGame(appName).stop(false)
}

// notify the user based on the status of the element and the status of the queue
function processNotification(element: DMQueueElement, status: DMStatus) {
  const action = element.type === 'install' ? 'Installation' : 'Update'
  if (
    element.params.runner === 'gog' &&
    element.params.appName === 'gog-redist'
  ) {
    return
  }
  const { title } = libraryManagerMap[element.params.runner]
    .getGame(element.params.appName)
    .getGameInfo()

  if (status === 'abort') {
    if (isPaused()) {
      logWarning(
        [action, 'of', element.params.appName, 'paused!'],
        LogPrefix.DownloadManager
      )
      // t('notify.update.paused', 'Update Paused')
      // t('notify.install.paused', 'Installation Paused')
      notify({ title, body: t(`notify.${element.type}.paused`) })
    } else {
      logWarning(
        [action, 'of', element.params.appName, 'aborted!'],
        LogPrefix.DownloadManager
      )
      // t('notify.update.canceled', 'Update Canceled')
      // t('notify.install.canceled', 'Installation Canceled')
      notify({ title, body: t(`notify.${element.type}.canceled`) })
    }
  } else if (status === 'error') {
    logWarning(
      [action, 'of', element.params.appName, 'failed!'],
      LogPrefix.DownloadManager
    )
    // t('notify.update.failed', 'Update Failed')
    // t('notify.install.failed', 'Installation Failed')
    notify({ title, body: t(`notify.${element.type}.failed`) })
  } else if (status === 'done') {
    // t('notify.update.finished', 'Update Finished')
    // t('notify.install.finished', 'Installation Finished')
    notify({
      title,
      body: t(`notify.${element.type}.finished`)
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
  resumeCurrentDownload,
  isRunning
}
