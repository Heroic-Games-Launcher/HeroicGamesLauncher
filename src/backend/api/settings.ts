import { ipcRenderer } from 'electron'

export const getLegendaryVersion = async (): Promise<string> =>
  ipcRenderer.invoke('getLegendaryVersion')
export const getGogdlVersion = async (): Promise<string> =>
  ipcRenderer.invoke('getGogdlVersion')
export const getEosOverlayStatus = async (): Promise<{
  isInstalled: boolean
  version?: string | undefined
  install_path?: string | undefined
}> => ipcRenderer.invoke('getEosOverlayStatus')
export const getLatestEosOverlayVersion = async (): Promise<string> =>
  ipcRenderer.invoke('getLatestEosOverlayVersion')
export const removeEosOverlay = async (): Promise<boolean> =>
  ipcRenderer.invoke('removeEosOverlay')
export const cancelEosOverlayInstallOrUpdate = async (): Promise<void> =>
  ipcRenderer.invoke('cancelEosOverlayInstallOrUpdate')
export const updateEosOverlayInfo = async (): Promise<void> =>
  ipcRenderer.invoke('updateEosOverlayInfo')

export const changeTrayColor = () => ipcRenderer.send('changeTrayColor')
export const getMaxCpus = async (): Promise<number> =>
  ipcRenderer.invoke('getMaxCpus')
export const showUpdateSetting = async (): Promise<boolean> =>
  ipcRenderer.invoke('showUpdateSetting')
export const egsSync = async (args: string): Promise<string> =>
  ipcRenderer.invoke('egsSync', args)
export const showErrorBox = async (args: { title: string; message: string }) =>
  ipcRenderer.invoke('showErrorBox', args)

export const showLogFileInFolder = (args: {
  appName: string
  defaultLast?: boolean
}) => ipcRenderer.send('showLogFileInFolder', args)
export const getLogContent = async (args: {
  appName: string
  defaultLast?: boolean
}) => ipcRenderer.invoke('getLogContent', args)
