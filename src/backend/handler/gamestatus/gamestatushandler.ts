import { GameStatus } from './../../../common/types'
import { getMainWindow } from '../../utils'
import Store from 'electron-store'

const gameStatusHandlerStore = new Store({
  cwd: 'store',
  name: 'progress-handler'
})

function initGameStatusHandler() {
  const gameStatusHandlers = getAllGameStatus()
  gameStatusHandlers.forEach((gameStatus) => {
    gameStatus.previousProgress = gameStatus.progress
    gameStatus.status = 'done'
  })

  gameStatusHandlerStore.set('gameStatus', gameStatusHandlers)
}

function setGameStatusOfElement(gameStatus: GameStatus) {
  let newGameStatus = gameStatus
  if (!gameStatusHandlerStore.has('gameStatus')) {
    gameStatusHandlerStore.set('gameStatus', [gameStatus])
    return
  }

  const gameStatusHandlers = gameStatusHandlerStore.get(
    'gameStatus'
  ) as GameStatus[]

  const gameStatusHandlerIndex = gameStatusHandlers.findIndex(
    (status) => status.appName === gameStatus.appName
  )

  if (gameStatusHandlerIndex >= 0) {
    newGameStatus = {
      ...gameStatusHandlers[gameStatusHandlerIndex],
      ...gameStatus
    }
    gameStatusHandlers[gameStatusHandlerIndex] = newGameStatus
  } else {
    gameStatusHandlers.push(newGameStatus)
  }

  gameStatusHandlerStore.set('gameStatus', gameStatusHandlers)

  const mainWindow = getMainWindow()
  if (mainWindow && mainWindow.webContents) {
    getMainWindow().webContents.send('handleGameStatus', newGameStatus)
  }
}

function deleteGameStatusOfElement(appName: string) {
  if (gameStatusHandlerStore.has('gameStatus')) {
    const gameStatusHandlers = gameStatusHandlerStore.get(
      'gameStatus'
    ) as GameStatus[]

    const gameStatusHandlerIndex = gameStatusHandlers.findIndex(
      (status) => status.appName === appName
    )

    if (gameStatusHandlerIndex >= 0) {
      const gameStatus = gameStatusHandlers.splice(gameStatusHandlerIndex, 1)[0]
      gameStatus.status = 'done'
      gameStatusHandlerStore.set('gameStatus', gameStatusHandlers)

      const mainWindow = getMainWindow()
      if (mainWindow && mainWindow.webContents) {
        getMainWindow().webContents.send('handleGameStatus', gameStatus)
      }
    }
  }
}

function getGameStatusOfElement(appName: string): GameStatus | undefined {
  if (gameStatusHandlerStore.has('gameStatus')) {
    const gameStatusHandlers = gameStatusHandlerStore.get(
      'gameStatus'
    ) as GameStatus[]

    return gameStatusHandlers.find((status) => status.appName === appName)
  }
  return
}

function getAllGameStatus(): GameStatus[] {
  if (gameStatusHandlerStore.has('gameStatus')) {
    return gameStatusHandlerStore.get('gameStatus') as GameStatus[]
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
