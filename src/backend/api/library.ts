import { ipcRenderer } from 'electron'
import {
  Runner,
  InstallParams,
  LaunchParams,
  SideloadGame,
  ImportGameArgs,
  GameStatus
} from 'common/types'

export const removeFolder = (args: [path: string, folderName: string]) =>
  ipcRenderer.send('removeFolder', args)

export const openDialog = async (args: Electron.OpenDialogOptions) =>
  ipcRenderer.invoke('openDialog', args)

export const uninstall = async (
  appName: string,
  runner: Runner,
  shouldRemovePrefix: boolean
) => {
  if (runner === 'sideload') {
    return ipcRenderer.invoke('removeApp', { appName, shouldRemovePrefix })
  } else {
    return ipcRenderer.invoke('uninstall', appName, runner, shouldRemovePrefix)
  }
}

export const repair = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('repair', appName, runner)

export const launch = async (args: LaunchParams) =>
  ipcRenderer.invoke('launch', args)

export const importGame = async (args: ImportGameArgs) =>
  ipcRenderer.invoke('importGame', args)

export const handleSetGameStatus = (
  callback: (event: Electron.IpcRendererEvent, status: GameStatus) => void
): (() => void) => {
  ipcRenderer.on('setGameStatus', callback)
  return () => {
    ipcRenderer.removeListener('setGameStatus', callback)
  }
}

export const handleLaunchGame = (
  callback: (
    event: Electron.IpcRendererEvent,
    appName: string,
    runner: Runner
  ) => Promise<{ status: 'done' | 'error' }>
) => ipcRenderer.on('launchGame', callback)

export const handleInstallGame = (
  callback: (event: Electron.IpcRendererEvent, args: InstallParams) => void
) => ipcRenderer.on('installGame', callback)

export const handleRefreshLibrary = (
  callback: (event: Electron.IpcRendererEvent, runner: Runner) => void
) => ipcRenderer.on('refreshLibrary', callback)

export const removeRecentGame = async (appName: string) =>
  ipcRenderer.invoke('removeRecent', appName)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleRecentGamesChanged = (callback: any) => {
  ipcRenderer.on('recentGamesChanged', callback)
  return () => {
    ipcRenderer.removeListener('recentGamesChanged', callback)
  }
}

export const addNewApp = (args: SideloadGame) =>
  ipcRenderer.send('addNewApp', args)

export const launchApp = async (appName: string): Promise<boolean> =>
  ipcRenderer.invoke('launchApp', appName)
