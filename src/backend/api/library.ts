import { ipcRenderer } from 'electron'
import { Runner, InstallPlatform, LaunchParams } from '../../common/types'

//src/frontend/helpers/library.ts
export const removeFolder = (args: [path: string, folderName: string]) =>
  ipcRenderer.send('removeFolder', args)

//invoke
export const openDialog = async (args: Electron.OpenDialogOptions) =>
  ipcRenderer.invoke('openDialog', args)
interface InstallArgs {
  appName: string
  path: string
  installDlcs: boolean
  sdlList: string[]
  installLanguage?: string
  runner: Runner
  platformToInstall?: InstallPlatform
}
export const install = async (args: InstallArgs) =>
  ipcRenderer.invoke('install', args)
export const openMessageBox = async (args: Electron.MessageBoxOptions) =>
  ipcRenderer.invoke('openMessageBox', args)
export const uninstall = async (
  args: [appName: string, checkboxChecked: boolean, runner: Runner]
) => ipcRenderer.invoke('uninstall', args)
export const repair = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('repair', appName, runner)
export const launch = async (args: LaunchParams) =>
  ipcRenderer.invoke('launch', args)
export const updateGame = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('updateGame', appName, runner)

interface ImportGameArgs {
  appName: string
  path: string
  runner: Runner
}
export const importGame = async (args: ImportGameArgs) =>
  ipcRenderer.invoke('importGame', args)

//main to renderer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleSetGameStatus = (callback: any) =>
  ipcRenderer.on('setGameStatus', callback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleProgressOf = (version: string, callback: any) =>
  ipcRenderer.on('progressOf' + version, callback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleLaunchGame = (callback: any) =>
  ipcRenderer.on('launchGame', callback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleInstallGame = (callback: any) =>
  ipcRenderer.on('installGame', callback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleRefreshLibrary = (callback: any) =>
  ipcRenderer.on('refreshLibrary', callback)
