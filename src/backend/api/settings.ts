import { ipcRenderer } from 'electron'

export const getLegendaryVersion = async () =>
  ipcRenderer.invoke('getLegendaryVersion')
export const getGogdlVersion = async () => ipcRenderer.invoke('getGogdlVersion')
export const getEosOverlayStatus = async () =>
  ipcRenderer.invoke('getEosOverlayStatus')
export const getLatestEosOverlayVersion = async () =>
  ipcRenderer.invoke('getLatestEosOverlayVersion')
export const removeEosOverlay = async () =>
  ipcRenderer.invoke('removeEosOverlay')
export const cancelEosOverlayInstallOrUpdate = async () =>
  ipcRenderer.invoke('cancelEosOverlayInstallOrUpdate')
export const updateEosOverlayInfo = async () =>
  ipcRenderer.invoke('updateEosOverlayInfo')

export const changeTrayColor = () => ipcRenderer.send('changeTrayColor')
export const getMaxCpus = async () => ipcRenderer.invoke('getMaxCpus')
export const showUpdateSetting = async () =>
  ipcRenderer.invoke('showUpdateSetting')
export const egsSync = async (args: string) =>
  ipcRenderer.invoke('egsSync', args)
export const showErrorBox = async (args: [title: string, message: string]) =>
  ipcRenderer.invoke('showErrorBox', args)

export const showLogFileInFolder = (args: {
  isDefault: boolean
  appName: string
  defaultLast?: boolean
}) => ipcRenderer.send('showLogFileInFolder', args)
export const getLogContent = async (args: {
  isDefault: boolean
  appName: string
  defaultLast?: boolean
}) => ipcRenderer.invoke('getLogContent', args)
