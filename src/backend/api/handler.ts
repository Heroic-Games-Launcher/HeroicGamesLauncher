import { GameStatus, GameStatusMap } from 'common/types'
import { ipcRenderer } from 'electron'

export const getGameStatus = async (appName: string) =>
  ipcRenderer.invoke('getGameStatus', appName)

export const getAllGameStatus = async (): Promise<GameStatusMap> =>
  ipcRenderer.invoke('getAllGameStatus')

export const handleGameStatus = (
  onChange: (e: Electron.IpcRendererEvent, status: GameStatus) => void
) => {
  ipcRenderer.on('handleGameStatus', onChange)
  return () => {
    ipcRenderer.removeListener('handleGameStatus', onChange)
  }
}
