import { GameStatus } from './../../../common/types'
import { getMainWindow } from '../../utils'
import Store from 'electron-store'

const store = new Store({
  cwd: 'store',
  name: 'progress-handler'
})

function initGameStatusHandler() {
  const handlers = getAllGameStatus()
  handlers.forEach((status) => {
    status.previousProgress = status.progress
    status.status = 'done'
  })

  store.set('gameStatus', handlers)
}

function setGameStatusOfElement(status: GameStatus) {
  const emptyMap = () => {
    const handlers = new Map<string, GameStatus>()
    handlers.set(status.appName, status)
    store.set('gameStatus', handlers)
  }

  if (!store.has('gameStatus')) {
    emptyMap()
  } else {
    const handlers = store.get('gameStatus') as Map<string, GameStatus>

    if (!handlers?.values()) {
      emptyMap()
    } else {
      handlers.set(status.appName, status)
      store.set('gameStatus', handlers)
    }
  }

  const mainWindow = getMainWindow()
  if (mainWindow?.webContents) {
    getMainWindow().webContents.send('handleGameStatus', status)
  }
}

function deleteGameStatusOfElement(appName: string) {
  if (store.has('gameStatus')) {
    const handlers = store.get('gameStatus') as Map<string, GameStatus>

    if (handlers?.values()) {
      const status = handlers.get(appName)
      if (status) {
        status.status = 'done'
      }

      handlers.delete(appName)
      store.set('gameStatus', handlers)

      const mainWindow = getMainWindow()
      if (mainWindow?.webContents) {
        getMainWindow().webContents.send('handleGameStatus', status)
      }
    }
  }
}

function getGameStatusOfElement(appName: string): GameStatus | undefined {
  if (store.has('gameStatus')) {
    const handlers = store.get('gameStatus') as Map<string, GameStatus>

    return handlers.get(appName)
  }
  return
}

function getAllGameStatus(): Map<string, GameStatus> {
  const emptyMap = new Map<string, GameStatus>()
  if (store.has('gameStatus')) {
    const handlers = store.get('gameStatus') as Map<string, GameStatus>
    return handlers ?? emptyMap
  }
  return emptyMap
}

export {
  initGameStatusHandler,
  setGameStatusOfElement,
  deleteGameStatusOfElement,
  getGameStatusOfElement,
  getAllGameStatus
}
