import { ipcRenderer } from 'electron'
import { RuntimeName, ToolArgs } from 'common/types'

export const toggleDXVK = (args: ToolArgs) =>
  ipcRenderer.send('toggleDXVK', args)
export const toggleVKD3D = (args: ToolArgs) =>
  ipcRenderer.send('toggleVKD3D', args)
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

export const handleProgressOfWinetricks = (
  onProgress: (e: Electron.IpcRendererEvent, messages: string[]) => void
): (() => void) => {
  ipcRenderer.on('progressOfWinetricks', onProgress)
  return () => {
    ipcRenderer.removeListener('progressOfWinetricks', onProgress)
  }
}
