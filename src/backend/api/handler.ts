import { GameStatus } from 'common/types'
import { ipcRenderer } from 'electron'

export const deleteGameStatus = (appName: string) =>
  ipcRenderer.send('deleteGameStatus', appName)

export const getGameStatus = async (appName: string) =>
  ipcRenderer.invoke('getGameStatus', appName)

export const getAllGameStatus = async () =>
  ipcRenderer.invoke('getAllGameStatus')

export const setGameStatus = async (gameStatus: GameStatus) =>
  ipcRenderer.invoke('setGameStatus', gameStatus)

export const handleGameStatus = (
  onChange: (e: Electron.IpcRendererEvent, status: GameStatus) => void
) => {
  ipcRenderer.on('handleGameStatus', onChange)
  return () => {
    ipcRenderer.removeListener('handleGameStatus', onChange)
  }
}
