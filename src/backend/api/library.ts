import { ipcRenderer } from 'electron'
import { Runner, LaunchParams, SideloadGame, InstallParams } from 'common/types'

export const removeFolder = (args: [path: string, folderName: string]) =>
  ipcRenderer.send('removeFolder', args)

export const openDialog = async (args: Electron.OpenDialogOptions) =>
  ipcRenderer.invoke('openDialog', args)

export const install = async (args: InstallParams) =>
  ipcRenderer.invoke('install', args)
export const uninstall = async (
  args: [appName: string, shouldRemovePrefix: boolean, runner: Runner]
) => {
  const [appName, shouldRemovePrefix, runner] = args
  if (runner === 'sideload') {
    return ipcRenderer.invoke('removeApp', { appName, shouldRemovePrefix })
  }
  ipcRenderer.invoke('uninstall', args)
}
export const repair = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('repair', appName, runner)
export const launch = async (args: LaunchParams) => {
  ipcRenderer.invoke('launch', args)
}
export const updateGame = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('updateGame', appName, runner)

interface ImportGameArgs {
  appName: string
  path: string
  runner: Runner
}
export const importGame = async (args: ImportGameArgs) =>
  ipcRenderer.invoke('importGame', args)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleSetGameStatus = (callback: any) => {
  ipcRenderer.on('setGameStatus', callback)
  return () => {
    ipcRenderer.removeListener('setGameStatus', callback)
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleLaunchGame = (callback: any) =>
  ipcRenderer.on('launchGame', callback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleInstallGame = (callback: any) =>
  ipcRenderer.on('installGame', callback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleRefreshLibrary = (callback: any) =>
  ipcRenderer.on('refreshLibrary', callback)

export const addNewApp = (args: SideloadGame) =>
  ipcRenderer.send('addNewApp', args)

export const removeApp = (appName: string) =>
  ipcRenderer.send('removeApp', appName)

export const launchApp = async (appName: string) =>
  ipcRenderer.invoke('launchApp', appName)
