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
export const updateEosOverlayInfo = async () =>
  ipcRenderer.invoke('updateEosOverlayInfo')

export const changeTrayColor = () => ipcRenderer.send('changeTrayColor')
export const getMaxCpus = async () => ipcRenderer.invoke('getMaxCpus')
export const showUpdateSetting = async () =>
  ipcRenderer.invoke('showUpdateSetting')
export const egsSync = async (args: string) =>
  ipcRenderer.invoke('egsSync', args)

export const showLogFileInFolder = (args: {
  appName: string
  defaultLast?: boolean
}) => ipcRenderer.send('showLogFileInFolder', args)
export const getLogContent = async (args: {
  appName: string
  defaultLast?: boolean
}) => ipcRenderer.invoke('getLogContent', args)
