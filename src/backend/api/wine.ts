import { ipcRenderer } from 'electron'
import { RuntimeName, WineVersionInfo } from '../../common/types'

export const toggleDXVK = (
  args: [wineArgs: { winePrefix: string; winePath: string }, action: string]
) => ipcRenderer.send('toggleDXVK', args)
export const toggleVKD3D = (
  args: [wineArgs: { winePrefix: string; winePath: string }, action: string]
) => ipcRenderer.send('toggleVKD3D', args)
export const isFlatpak = async () => ipcRenderer.invoke('isFlatpak')
export const isRuntimeInstalled = async (runtime_name: RuntimeName) =>
  ipcRenderer.invoke('isRuntimeInstalled', runtime_name)
export const downloadRuntime = async (runtime_name: RuntimeName) =>
  ipcRenderer.invoke('downloadRuntime', runtime_name)

export const showItemInFolder = (installDir: string) =>
  ipcRenderer.send('showItemInFolder', installDir)
export const abortWineInstallation = (version: string) =>
  ipcRenderer.send('abortWineInstallation', version)
export const installWineVersion = async (release: WineVersionInfo) =>
  ipcRenderer.invoke('installWineVersion', release)
export const removeWineVersion = async (release: WineVersionInfo) =>
  ipcRenderer.invoke('removeWineVersion', release)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleProgressOfWinetricks = (onProgress: any) =>
  ipcRenderer.on('progressOfWinetricks', onProgress)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const progressOfWinetricksRemoveListener = (onProgress: any) =>
  ipcRenderer.removeListener('progressOfWinetricks', onProgress)
