import { ipcRenderer } from 'electron'
import {
  Runner,
  InstallParams,
  LaunchParams,
  ImportGameArgs,
  GameStatus
} from 'common/types'

export const removeFolder = (args: [path: string, folderName: string]) =>
  ipcRenderer.send('removeFolder', args)

export const openDialog = async (
  args: Electron.OpenDialogOptions
): Promise<string | false> => ipcRenderer.invoke('openDialog', args)

export const install = async (
  args: InstallParams
): Promise<{ status: 'error' | 'done' }> => ipcRenderer.invoke('install', args)

export const openMessageBox = async (
  args: Electron.MessageBoxOptions
): Promise<Electron.MessageBoxReturnValue> =>
  ipcRenderer.invoke('openMessageBox', args)

export const uninstall = async (
  appName: string,
  runner: Runner,
  shouldRemovePrefix: boolean
): Promise<void> =>
  ipcRenderer.invoke('uninstall', appName, runner, shouldRemovePrefix)

export const repair = async (appName: string, runner: Runner): Promise<void> =>
  ipcRenderer.invoke('repair', appName, runner)

export const launch = async (
  args: LaunchParams
): Promise<{ status: 'done' | 'error' }> => ipcRenderer.invoke('launch', args)

export const updateGame = async (
  appName: string,
  runner: Runner
): Promise<{ status: 'done' | 'error' }> =>
  ipcRenderer.invoke('updateGame', appName, runner)

export const importGame = async (
  args: ImportGameArgs
): Promise<{ status: 'done' | 'error' }> =>
  ipcRenderer.invoke('importGame', args)

export const handleSetGameStatus = (
  callback: (event: Electron.IpcRendererEvent, status: GameStatus) => void
) => {
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
