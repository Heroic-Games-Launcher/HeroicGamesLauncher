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
  let newStatus = status
  if (!store.has('gameStatus')) {
    store.set('gameStatus', [status])
    return
  }

  const handlers = store.get('gameStatus') as GameStatus[]

  const handlerIndex = handlers.findIndex(
    (status) => newStatus.appName === status.appName
  )

  if (handlerIndex >= 0) {
    newStatus = {
      ...handlers[handlerIndex],
      ...status
    }
    handlers[handlerIndex] = newStatus
  } else {
    handlers.push(newStatus)
  }

  store.set('gameStatus', handlers)

  const mainWindow = getMainWindow()
  if (mainWindow && mainWindow.webContents) {
    getMainWindow().webContents.send('handleGameStatus', newStatus)
  }
}

function deleteGameStatusOfElement(appName: string) {
  if (store.has('gameStatus')) {
    const handlers = store.get('gameStatus') as GameStatus[]

    const handlerIndex = handlers.findIndex(
      (status) => status.appName === appName
    )

    if (handlerIndex >= 0) {
      const status = handlers.splice(handlerIndex, 1)[0]
      status.status = 'done'
      store.set('gameStatus', handlers)

      const mainWindow = getMainWindow()
      if (mainWindow && mainWindow.webContents) {
        getMainWindow().webContents.send('handleGameStatus', status)
      }
    }
  }
}

function getGameStatusOfElement(appName: string): GameStatus | undefined {
  if (store.has('gameStatus')) {
    const handlers = store.get('gameStatus') as GameStatus[]

    return handlers.find((status) => status.appName === appName)
  }
  return
}

function getAllGameStatus(): GameStatus[] {
  if (store.has('gameStatus')) {
    return store.get('gameStatus') as GameStatus[]
  }
  return []
}

export {
  initGameStatusHandler,
  setGameStatusOfElement,
  deleteGameStatusOfElement,
  getGameStatusOfElement,
  getAllGameStatus
}
