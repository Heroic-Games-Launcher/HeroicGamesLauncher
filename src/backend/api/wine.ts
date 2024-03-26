import { ipcRenderer } from 'electron'
import {
  RuntimeName,
  ToolArgs,
  WineVersionInfo,
  Runner,
  type WineManagerStatus
} from 'common/types'

export const toggleDXVK = async (args: ToolArgs) =>
  ipcRenderer.invoke('toggleDXVK', args)
export const toggleVKD3D = async (args: ToolArgs) =>
  ipcRenderer.invoke('toggleVKD3D', args)
export const toggleDXVKNVAPI = async (args: ToolArgs) =>
  ipcRenderer.invoke('toggleDXVKNVAPI', args)
export const isFlatpak = async (): Promise<boolean> =>
  ipcRenderer.invoke('isFlatpak')
export const isRuntimeInstalled = async (
  runtime_name: RuntimeName
): Promise<boolean> => ipcRenderer.invoke('isRuntimeInstalled', runtime_name)
export const downloadRuntime = async (
  runtime_name: RuntimeName
): Promise<boolean> => ipcRenderer.invoke('downloadRuntime', runtime_name)

export const showItemInFolder = (installDir: string) =>
  ipcRenderer.send('showItemInFolder', installDir)
export const installWineVersion = async (
  release: WineVersionInfo
): Promise<void> => ipcRenderer.invoke('installWineVersion', release)
export const removeWineVersion = async (
  release: WineVersionInfo
): Promise<void> => ipcRenderer.invoke('removeWineVersion', release)
export const refreshWineVersionInfo = async (fetch?: boolean): Promise<void> =>
  ipcRenderer.invoke('refreshWineVersionInfo', fetch)

export const handleProgressOfWinetricks = (
  onProgress: (
    e: Electron.IpcRendererEvent,
    payload: { messages: string[]; installingComponent: '' }
  ) => void
): (() => void) => {
  ipcRenderer.on('progressOfWinetricks', onProgress)
  return () => {
    ipcRenderer.removeListener('progressOfWinetricks', onProgress)
  }
}

export const handleProgressOfWineManager = (
  callback: (
    e: Electron.IpcRendererEvent,
    version: string,
    progress: WineManagerStatus
  ) => void
): (() => void) => {
  ipcRenderer.on('progressOfWineManager', callback)
  return () => {
    ipcRenderer.removeListener('progressOfWineManager', callback)
  }
}

export const handleWineVersionsUpdated = (
  callback: () => void
): (() => void) => {
  ipcRenderer.on('wineVersionsUpdated', callback)
  return () => {
    ipcRenderer.removeListener('wineVersionsUpdated', callback)
  }
}

export const winetricksListInstalled = async (
  runner: Runner,
  appName: string
): Promise<string[]> =>
  ipcRenderer.invoke('winetricksInstalled', { runner, appName })

export const winetricksListAvailable = async (
  runner: Runner,
  appName: string
): Promise<string[]> =>
  ipcRenderer.invoke('winetricksAvailable', { runner, appName })

export const winetricksInstall = async (
  runner: Runner,
  appName: string,
  component: string
): Promise<void> =>
  ipcRenderer.send('winetricksInstall', { runner, appName, component })

export const handleWinetricksInstalling = (
  callback: (e: Electron.IpcRendererEvent, component: string) => void
): (() => void) => {
  ipcRenderer.on('installing-winetricks-component', callback)
  return () => {
    ipcRenderer.removeListener('installing-winetricks-component', callback)
  }
}
