import { getMainWindow } from '../../utils'
import { GameStatus } from 'common/types'
import Store from 'electron-store'

const gameStatusHandlerStore = new Store({
  cwd: 'store',
  name: 'progress-handler'
})

function setGameStatusOfElement(gameStatus: GameStatus) {
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
    gameStatusHandlers[gameStatusHandlerIndex] = {
      ...gameStatusHandlers[gameStatusHandlerIndex],
      ...gameStatus
    }
  } else {
    gameStatusHandlers.push(gameStatus)
  }

  gameStatusHandlerStore.set('gameStatus', gameStatusHandlers)

  const mainWindow = getMainWindow()
  if (mainWindow && mainWindow.webContents) {
    getMainWindow().webContents.send('handleGameStatus', gameStatus)
    getMainWindow().webContents.send('handleAllGameStatus', getAllGameStatus())
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
      const gameStatus = gameStatusHandlers.splice(gameStatusHandlerIndex, 1)
      gameStatus[0].status = 'done'
      gameStatusHandlerStore.set('gameStatus', gameStatusHandlers)

      const mainWindow = getMainWindow()
      if (mainWindow && mainWindow.webContents) {
        getMainWindow().webContents.send('handleGameStatus', gameStatus)
        getMainWindow().webContents.send(
          'handleAllGameStatus',
          getAllGameStatus()
        )
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
  setGameStatusOfElement,
  deleteGameStatusOfElement,
  getGameStatusOfElement,
  getAllGameStatus
}
