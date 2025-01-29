import { ipcRenderer } from 'electron'
import {
  Runner,
  LaunchParams,
  ImportGameArgs,
  GameStatus,
  GameInfo
} from 'common/types'

export const removeFolder = (args: [path: string, folderName: string]) =>
  ipcRenderer.send('removeFolder', args)

export const openDialog = async (args: Electron.OpenDialogOptions) =>
  ipcRenderer.invoke('openDialog', args)

export const uninstall = async (
  appName: string,
  runner: Runner,
  shouldRemovePrefix: boolean,
  shouldRemoveSetting: boolean
) => {
  if (runner === 'sideload') {
    return ipcRenderer.invoke('removeApp', {
      appName,
      shouldRemovePrefix,
      runner
    })
  } else {
    return ipcRenderer.invoke(
      'uninstall',
      appName,
      runner,
      shouldRemovePrefix,
      shouldRemoveSetting
    )
  }
}

export const repair = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('repair', appName, runner)

export const launch = async (args: LaunchParams) =>
  ipcRenderer.invoke('launch', args)

export const importGame = async (args: ImportGameArgs) =>
  ipcRenderer.invoke('importGame', args)

export const handleGameStatus = (
  onChange: (e: Electron.IpcRendererEvent, status: GameStatus) => void
) => {
  ipcRenderer.on('gameStatusUpdate', onChange)
  return () => {
    ipcRenderer.removeListener('gameStatusUpdate', onChange)
  }
}

export const onProgressUpdate = (
  appName: string,
  onChange: (e: Electron.IpcRendererEvent, status: GameStatus) => void
) => {
  ipcRenderer.on(`progressUpdate-${appName}`, onChange)
  return () => {
    ipcRenderer.removeListener(`progressUpdate-${appName}`, onChange)
  }
}

export const handleInstallGame = (
  callback: (
    event: Electron.IpcRendererEvent,
    appName: string,
    runner: Runner
  ) => void
) => ipcRenderer.on('installGame', callback)

export const handleRefreshLibrary = (
  callback: (event: Electron.IpcRendererEvent, runner?: Runner) => void
) => ipcRenderer.on('refreshLibrary', callback)

export const handleGamePush = (
  callback: (event: Electron.IpcRendererEvent, game: GameInfo) => void
) => ipcRenderer.on('pushGameToLibrary', callback)

export const removeRecentGame = async (appName: string) =>
  ipcRenderer.invoke('removeRecent', appName)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleRecentGamesChanged = (callback: any) => {
  ipcRenderer.on('recentGamesChanged', callback)
  return () => {
    ipcRenderer.removeListener('recentGamesChanged', callback)
  }
}

export const addNewApp = (args: GameInfo) => ipcRenderer.send('addNewApp', args)

export const changeGameVersionPinnedStatus = (
  appName: string,
  runner: Runner,
  status: boolean
) => ipcRenderer.send('changeGameVersionPinnedStatus', appName, runner, status)

export const getGameOverride = async () => ipcRenderer.invoke('getGameOverride')

export const getGameSdl = async (appName: string) =>
  ipcRenderer.invoke('getGameSdl', appName)
