import { libraryManagerMap } from 'backend/storeManagers'
import { TypeCheckedStoreBackend } from './../electron_store'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { getFileSize, removeFolder, sendGameStatusUpdate } from '../utils'
import { DMQueueElement, DMStatus, DownloadManagerState } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'
import { sendFrontendMessage } from '../ipc'
import { callAbortController } from 'backend/utils/aborthandler/aborthandler'
import { notify } from '../dialog/dialog'
import i18next from 'i18next'
import { createRedistDMQueueElement } from 'backend/storeManagers/gog/redist'
import {
  forgetSteamInstall,
  pruneSteamBacklog
} from 'backend/storeManagers/steam/backlog'
import { existsSync } from 'fs'
import { gogRedistPath } from 'backend/storeManagers/gog/constants'
import { onConnectivityChange } from 'backend/online_monitor'

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
// Running loop stops overlapping runs.
let queueLoop: Promise<void> | null = null
// Failed updates; auto-update skips them.
const failedUpdates = new Set<string>()
const updateKey = (appName: string, runner: string) => `${runner}:${appName}`

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

function initQueue(): Promise<void> {
  queueLoop ??= runQueue().finally(() => {
    queueLoop = null
  })
  return queueLoop
}

async function runQueue() {
  // Drop Steam backlog entries we cancelled.
  const queuedSteam = new Set(
    downloadManager
      .get('queue', [])
      .filter((e) => e.params.runner === 'steam')
      .map((e) => e.params.appName)
  )
  await pruneSteamBacklog(queuedSteam)

  let element = getFirstQueueElement()

  while (element) {
    const queuedElements = downloadManager.get('queue', [])
    element.startTime = Date.now()
    // Resumes now; no longer paused.
    delete element.pausedAt
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

    if (element.type === 'update') {
      const key = updateKey(element.params.appName, element.params.runner)
      if (status === 'error') failedUpdates.add(key)
      else if (status === 'done') failedUpdates.delete(key)
    }

    processNotification(element, status)

    if (!isPaused()) {
      addToFinished(element, status)
      removeFromQueue(element.params.appName)
      element = getFirstQueueElement()
    } else {
      element = null
    }
  }

  if (queueState !== 'paused') {
    queueState = 'idle'
  }
}

/** Whether this session's update failed. */
function hasFailedUpdate(appName: string, runner: string): boolean {
  return failedUpdates.has(updateKey(appName, runner))
}

/**
 * Queue a download. `userStarted` lets it
 * jump ahead of a paused download.
 */
async function addToQueue(
  element: DMQueueElement,
  { userStarted = false }: { userStarted?: boolean } = {}
) {
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

  if (userStarted) {
    // Manual retry clears the failure.
    failedUpdates.delete(
      updateKey(element.params.appName, element.params.runner)
    )
  }

  // Let a pausing run wind down.
  if (isPaused()) await queueLoop

  const sameElement = (el: DMQueueElement) =>
    el.params.appName === element.params.appName &&
    el.params.runner === element.params.runner
  const added: DMQueueElement[] = []

  if (!downloadManager.get('queue', []).some(sameElement)) {
    const gameInfo = libraryManagerMap[element.params.runner].getGameInfo(
      element.params.appName
    )
    if (!gameInfo?.isEAManaged && !gameInfo?.isUbisoftManaged) {
      const installInfo = await libraryManagerMap[
        element.params.runner
      ].getInstallInfo(
        element.params.appName,
        element.params.platformToInstall,
        {
          branch: element.params.branch,
          build: element.params.build
        }
      )

      element.params.size = installInfo?.manifest?.download_size
        ? getFileSize(installInfo?.manifest?.download_size)
        : '?? MB'

      if (
        element.params.runner === 'gog' &&
        element.params.platformToInstall.toLowerCase() === 'windows' &&
        installInfo &&
        installInfo.manifest &&
        'dependencies' in installInfo.manifest
      ) {
        const newDependencies = installInfo.manifest.dependencies || []
        if (newDependencies?.length || !existsSync(gogRedistPath)) {
          // create redist element
          const redistElement = createRedistDMQueueElement()
          redistElement.params.dependencies = newDependencies
          added.push(redistElement)
        }
      }
    } else {
      element.params.size = '?? MB'
    }
  }

  // No awaits below: concurrent adds stay ordered.
  const elements = downloadManager.get('queue', [])
  const elementIndex = elements.findIndex(sameElement)
  // Paused head yields to user downloads.
  const displacePaused =
    elementIndex < 0 && userStarted && isPaused() && elements.length > 0

  if (elementIndex >= 0) {
    elements[elementIndex] = element
  } else {
    added.push(element)
    if (displacePaused) {
      elements[0] = { ...elements[0], pausedAt: Date.now() }
      elements.unshift(...added)
    } else {
      elements.push(...added)
    }
  }

  if (displacePaused) {
    // Paused game now waits in queue.
    const paused = elements[added.length]
    sendGameStatusUpdate({
      appName: paused.params.appName,
      runner: paused.params.runner,
      folder: paused.params.path,
      status: 'queued'
    })
    currentElement = null
    queueState = 'idle'
    logInfo(
      [paused.params.appName, 'paused; queued behind', element.params.appName],
      LogPrefix.DownloadManager
    )
  }

  downloadManager.set('queue', elements)
  logInfo(
    [element.params.gameInfo.title, ' was added to the download queue.'],
    LogPrefix.DownloadManager
  )

  sendFrontendMessage('changedDMQueueInformation', elements, queueState)

  if (isIdle()) {
    void initQueue()
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

/** Drop an element and its partial files. */
function cancelElement(element: DMQueueElement, removeDownloaded: boolean) {
  if (Array.isArray(element.params.installDlcs)) {
    for (const dlc of element.params.installDlcs) {
      removeFromQueue(dlc)
    }
  }
  removeFromQueue(element.params.appName)

  const { appName, runner } = element.params
  if (runner === 'steam') {
    // Aurelia knows the safe folder.
    void forgetSteamInstall(appName, removeDownloaded)
  } else if (removeDownloaded) {
    const { folder_name } = libraryManagerMap[runner]
      .getGame(appName)
      .getGameInfo()
    if (folder_name) {
      removeFolder(element.params.path, folder_name)
    }
  }
}

function cancelCurrentDownload({ removeDownloaded = false }) {
  if (currentElement) {
    if (isRunning()) {
      stopCurrentDownload()
    }
    cancelElement(currentElement, removeDownloaded)
    currentElement = null
  }
}

/** Cancel a paused game waiting in queue. */
function cancelQueuedDownload(appName: string, removeDownloaded = false) {
  if (currentElement?.params.appName === appName) {
    cancelCurrentDownload({ removeDownloaded })
    return
  }
  const element = downloadManager
    .get('queue', [])
    .find((el) => el.params.appName === appName)
  if (element) {
    cancelElement(element, removeDownloaded)
  }
}

function pauseCurrentDownload() {
  // Set first: runners check isPaused().
  queueState = 'paused'
  if (currentElement) {
    stopCurrentDownload()
  }
  autoPaused = false
  sendFrontendMessage(
    'changedDMQueueInformation',
    downloadManager.get('queue', []),
    queueState
  )
}

async function resumeCurrentDownload() {
  autoPaused = false
  // Let a pausing run wind down.
  await queueLoop
  void initQueue()
}

function stopCurrentDownload() {
  const { appName, runner } = currentElement!.params
  callAbortController(appName)
  libraryManagerMap[runner].getGame(appName).stop(false)
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
      // i18next.t('notify.update.paused', 'Update paused')
      // i18next.t('notify.install.paused', 'Installation paused')
      notify({ title, body: i18next.t(`notify.${element.type}.paused`) })
    } else {
      logWarning(
        [action, 'of', element.params.appName, 'aborted!'],
        LogPrefix.DownloadManager
      )
      // i18next.t('notify.update.canceled', 'Update canceled')
      // i18next.t('notify.install.canceled', 'Installation canceled')
      notify({ title, body: i18next.t(`notify.${element.type}.canceled`) })
    }
  } else if (status === 'error') {
    logWarning(
      [action, 'of', element.params.appName, 'failed!'],
      LogPrefix.DownloadManager
    )
    // i18next.t('notify.update.failed', 'Update failed')
    // i18next.t('notify.install.failed', 'Installation failed')
    notify({ title, body: i18next.t(`notify.${element.type}.failed`) })
  } else if (status === 'done') {
    // i18next.t('notify.update.finished', 'Update finished')
    // i18next.t('notify.install.finished', 'Installation finished')
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
  cancelQueuedDownload,
  hasFailedUpdate,
  pauseCurrentDownload,
  resumeCurrentDownload,
  isRunning,
  isPaused
}
