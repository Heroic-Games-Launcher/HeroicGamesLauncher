import { ipcRenderer } from 'electron'
import {
  ProgressInfo,
  State,
  ToolVersionInfo
} from './../../common/types/toolmanager'

export const installToolVersion = async (release: ToolVersionInfo) =>
  ipcRenderer.invoke('installToolVersion', release)
export const removeToolVersion = async (release: ToolVersionInfo) =>
  ipcRenderer.invoke('removeToolVersion', release)
export const refreshToolVersionInfo = async (fetch?: boolean) =>
  ipcRenderer.invoke('refreshToolVersionInfo', fetch)

export const handleProgressOfToolManager = (
  version: string,
  callback: (
    e: Electron.IpcRendererEvent,
    progress: {
      state: State
      progress: ProgressInfo
    }
  ) => void
) => {
  ipcRenderer.on('progressOfToolManager' + version, callback)
  return () => {
    ipcRenderer.removeListener('progressOfToolManager' + version, callback)
  }
}
