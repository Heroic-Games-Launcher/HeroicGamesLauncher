import { logError, logInfo, LogPrefix } from '../logger/logger'
import { getInfo, getMainWindow } from '../utils'
import Store from 'electron-store'
import { DMQueueElement, DMStatus } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'
import { prepareInstallWineVersion } from 'backend/wine/manager/utils'

const downloadManager = new Store({
  cwd: 'store',
  name: 'download-manager'
})

/* 
#### Private ####
*/

type DownloadManagerState = 'idle' | 'running'
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

  const elementIndex = elements.findIndex((el) => {
    element.typeElement === 'game'
      ? el.paramsGame?.appName === element.paramsGame?.appName
      : el.paramsTool?.version === element.paramsTool?.version
  })

  if (element.typeElement === 'game' && element.paramsGame) {
    const gameInfo = getInfo(
      element.paramsGame.appName,
      element.paramsGame.runner
    )
    element.paramsGame.gameInfo = gameInfo
  }

  if (elementIndex >= 0) {
    elements[elementIndex] = { ...element, status: status ?? 'abort' }
  } else {
    elements.push({ ...element, status })
  }

  downloadManager.set('finished', elements)
  logInfo(
    [
      element.typeElement === 'game'
        ? element.paramsGame?.appName
        : element.paramsTool?.version,
      'added to download manager finished.'
    ],
    {
      prefix: LogPrefix.DownloadManager
    }
  )
}

/* 
#### Public ####
*/

async function initQueue() {
  const cleanUpElement = (element: DMQueueElement, status: DMStatus) => {
    element.endTime = Date.now()
    addToFinished(element, status)
    removeFromQueue(
      (element.typeElement === 'game'
        ? element.paramsGame?.appName
        : element.paramsTool?.version) ?? ''
    )
  }

  const window = getMainWindow()
  let element = getFirstQueueElement()
  queueState = element ? 'running' : 'idle'

  while (element) {
    const queuedElements = downloadManager.get('queue') as DMQueueElement[]
    window.webContents.send('changedDMQueueInformation', queuedElements)
    element.startTime = Date.now()
    queuedElements[0] = element
    downloadManager.set('queue', queuedElements)

    if (element.typeElement === 'game' && element.paramsGame) {
      const { status } =
        element.type === 'install'
          ? await installQueueElement(window, element.paramsGame)
          : await updateQueueElement(window, element.paramsGame)
      cleanUpElement(element, status)
    } else if (element.typeElement === 'tool' && element.paramsTool) {
      const status = await prepareInstallWineVersion(window, element.paramsTool)
      cleanUpElement(element, status)
    }
    element = getFirstQueueElement()
  }
  queueState = 'idle'
}

function addToQueue(element: DMQueueElement) {
  if (!element) {
    logError('Can not add undefined element to queue!', {
      prefix: LogPrefix.DownloadManager
    })
    return
  }

  const mainWindow = getMainWindow()
  mainWindow.webContents.send('setGameStatus', {
    appName:
      element.typeElement === 'game'
        ? element.paramsGame?.appName
        : element.paramsTool?.version,
    runner:
      element.typeElement === 'game' ? element.paramsGame?.runner : 'tool',
    folder:
      element.typeElement === 'game'
        ? element.paramsGame?.path
        : element.paramsTool?.installDir,
    status: 'queued'
  })

  let elements: DMQueueElement[] = []
  if (downloadManager.has('queue')) {
    elements = downloadManager.get('queue') as DMQueueElement[]
  }

  const elementIndex = elements.findIndex((el) => {
    return element.typeElement === 'game'
      ? el.paramsGame?.appName === element.paramsGame?.appName
      : el.paramsTool?.version === element.paramsTool?.version
  })

  if (elementIndex >= 0) {
    elements[elementIndex] = element
  } else {
    elements.push(element)
  }

  downloadManager.set('queue', elements)
  logInfo(
    [
      element.typeElement === 'game'
        ? element.paramsGame?.appName
        : element.paramsTool?.version,
      'added to download manager queue.'
    ],
    {
      prefix: LogPrefix.DownloadManager
    }
  )

  getMainWindow().webContents.send('changedDMQueueInformation', elements)

  if (queueState === 'idle') {
    initQueue()
  }
}

function removeFromQueue(appName: string) {
  const mainWindow = getMainWindow()

  if (appName && downloadManager.has('queue')) {
    let elements: DMQueueElement[] = []
    elements = downloadManager.get('queue') as DMQueueElement[]
    const index = elements.findIndex(
      (queueElement) =>
        queueElement?.paramsGame?.appName === appName ||
        queueElement?.paramsTool?.version === appName
    )
    if (index !== -1) {
      elements.splice(index, 1)
      downloadManager.delete('queue')
      downloadManager.set('queue', elements)
    }

    mainWindow.webContents.send('setGameStatus', {
      appName,
      status: 'done'
    })

    logInfo([appName, 'removed from download manager.'], {
      prefix: LogPrefix.DownloadManager
    })

    mainWindow.webContents.send('changedDMQueueInformation', elements)
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
