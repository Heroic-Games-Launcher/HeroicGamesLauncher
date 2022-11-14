import { ipcRenderer } from 'electron'
import { RuntimeName } from 'common/types'

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

export const handleProgressOfWinetricks = (
  onProgress: (e: Electron.IpcRendererEvent, messages: string[]) => void
) => {
  ipcRenderer.on('progressOfWinetricks', onProgress)
  return () => {
    ipcRenderer.removeListener('progressOfWinetricks', onProgress)
  }
}
