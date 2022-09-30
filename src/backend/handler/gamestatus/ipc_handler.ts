import { GameStatus } from 'common/types'
import { ipcMain } from 'electron'
import {
  deleteGameStatusOfElement,
  getAllGameStatus,
  getGameStatusOfElement,
  setGameStatusOfElement
} from './gamestatushandler'

ipcMain.handle('setGameStatus', (e, gameStatus: GameStatus) => {
  return setGameStatusOfElement(gameStatus)
})

ipcMain.on('deleteGameStatus', (e, appName: string) => {
  deleteGameStatusOfElement(appName)
})

ipcMain.handle('getGameStatus', (e, appName: string) => {
  return getGameStatusOfElement(appName)
})

ipcMain.handle('getAllGameStatus', () => {
  return getAllGameStatus()
})
