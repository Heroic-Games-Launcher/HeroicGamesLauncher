import { GameStatus } from 'common/types'
import { ipcMain } from 'electron'
import {
  getAllGameStatus,
  getGameStatusOfElement,
  setGameStatusOfElement
} from './gamestatushandler'

ipcMain.handle('setGameStatus', (e, gameStatus: GameStatus) => {
  return setGameStatusOfElement(gameStatus)
})

ipcMain.handle('getGameStatus', (e, appName: string) => {
  return getGameStatusOfElement(appName)
})

ipcMain.handle('getAllGameStatus', () => {
  return getAllGameStatus()
})
