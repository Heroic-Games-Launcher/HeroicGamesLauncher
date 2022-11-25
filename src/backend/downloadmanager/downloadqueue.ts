import { logError, logInfo, LogPrefix } from '../logger/logger'
import { getInfo, getMainWindow } from '../utils'
import Store from 'electron-store'
import { DMQueueElement } from 'common/types'
import { installQueueElement, updateQueueElement } from './utils'

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
  const gameInfo = getInfo(element.params.appName, element.params.runner)
  element.params.gameInfo = gameInfo
  if (elementIndex >= 0) {
    elements[elementIndex] = { ...element, status: status ?? 'abort' }
  } else {
    elements.push({ ...element, status })
  }

  downloadManager.set('finished', elements)
  logInfo([element.params.appName, 'added to download manager finished.'], {
    prefix: LogPrefix.DownloadManager
  })
}

/* 
#### Public ####
*/

async function initQueue() {
  const window = getMainWindow()
  let element = getFirstQueueElement()
  queueState = element ? 'running' : 'idle'

  while (element) {
    const queuedElements = downloadManager.get('queue') as DMQueueElement[]
    window.webContents.send('changedDMQueueInformation', queuedElements)
    element.startTime = Date.now()
    queuedElements[0] = element
    downloadManager.set('queue', queuedElements)

    const { status } =
      element.type === 'install'
        ? await installQueueElement(window, element.params)
        : await updateQueueElement(window, element.params)
    element.endTime = Date.now()
    addToFinished(element, status)
    removeFromQueue(element.params.appName)
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
  logInfo([element.params.appName, 'added to download manager queue.'], {
    prefix: LogPrefix.DownloadManager
  })

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
      (queueElement) => queueElement?.params.appName === appName
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

    getMainWindow().webContents.send('changedDMQueueInformation', elements)
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
