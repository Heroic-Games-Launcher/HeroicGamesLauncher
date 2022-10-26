import { ipcRenderer } from 'electron'
import { RuntimeName, WineVersionInfo } from 'common/types'
import { ProgressInfo, State } from 'heroic-wine-downloader'

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
export const refreshWineVersionInfo = async (fetch?: boolean) =>
  ipcRenderer.invoke('refreshWineVersionInfo', fetch)

export const handleProgressOfWinetricks = (
  onProgress: (e: Electron.IpcRendererEvent, messages: string[]) => void
) => {
  ipcRenderer.on('progressOfWinetricks', onProgress)
  return () => {
    ipcRenderer.removeListener('progressOfWinetricks', onProgress)
  }
}

export const handleProgressOfWineManager = (
  version: string,
  callback: (
    e: Electron.IpcRendererEvent,
    progress: {
      state: State
      progress: ProgressInfo
    }
  ) => void
) => {
  ipcRenderer.on('progressOfWineManager' + version, callback)
  return () => {
    ipcRenderer.removeListener('progressOfWineManager' + version, callback)
  }
}
