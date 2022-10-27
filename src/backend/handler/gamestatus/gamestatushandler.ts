import { GameStatus, GameStatusMap } from 'common/types'
import { getMainWindow } from '../../utils'
import Store from 'electron-store'

const store = new Store({
  cwd: 'store',
  name: 'progress-handler'
})

function initGameStatusHandler() {
  const handlers = getAllGameStatus()
  for (const key in handlers) {
    const status = handlers[key]
    status.status = 'done'
  }

  store.set('gameStatus', handlers)
}

function setGameStatusOfElement(status: GameStatus) {
  const handlers = store.get('gameStatus', {}) as GameStatusMap

  const oldStatus = handlers[status.appName]
  handlers[status.appName] = status
  store.set('gameStatus', handlers)

  const webContents = getMainWindow()?.webContents
  if (webContents) {
    if (
      status.status === 'installing' &&
      oldStatus.progress !== status.progress
    ) {
      webContents.send(`handleProgressUpdate-${status.appName}`, status)
      webContents.send('handleProgressUpdate-all', status)
    } else {
      webContents.send('handleGameStatus', status)
    }
  }
}

function deleteGameStatusOfElement(appName: string) {
  const handlers = store.get('gameStatus', {}) as GameStatusMap

  if (handlers[appName]) {
    const status = handlers[appName]
    status.status = 'done'

    delete handlers[appName]
    store.set('gameStatus', { ...handlers })

    const webContents = getMainWindow()?.webContents
    if (webContents) {
      webContents.send('handleGameStatus', status)
    }
  }
}

function getGameStatusOfElement(appName: string): GameStatus | undefined {
  const handlers = store.get('gameStatus', {}) as GameStatusMap
  return handlers[appName]
}

function getAllGameStatus(): GameStatusMap {
  return store.get('gameStatus', {}) as GameStatusMap
}

export {
  initGameStatusHandler,
  setGameStatusOfElement,
  deleteGameStatusOfElement,
  getGameStatusOfElement,
  getAllGameStatus
}
