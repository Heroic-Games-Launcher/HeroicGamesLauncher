import { AppSettings, GameSettings } from 'common/types'
import { ipcRenderer } from 'electron'
import type { SystemInformation } from '../utils/systeminfo'

export const requestAppSettings = async () =>
  ipcRenderer.invoke('requestSettings', 'default') as Promise<AppSettings>

export const requestGameSettings = async (appName: string) =>
  ipcRenderer.invoke('requestSettings', appName) as Promise<GameSettings>

export const setSetting = (args: {
  appName: string
  key: string
  value: unknown
}) => ipcRenderer.send('setSetting', args)

export const getLegendaryVersion = async () =>
  ipcRenderer.invoke('getLegendaryVersion')
export const getGogdlVersion = async () => ipcRenderer.invoke('getGogdlVersion')
export const getNileVersion = async () => ipcRenderer.invoke('getNileVersion')
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

export const showLogFileInFolder = (appNameOrRunner: string) =>
  ipcRenderer.send('showLogFileInFolder', appNameOrRunner)
export const getLogContent = async (appNameOrRunner: string) =>
  ipcRenderer.invoke('getLogContent', appNameOrRunner)

export const systemInfo = {
  get: async (cache?: boolean): Promise<SystemInformation> =>
    ipcRenderer.invoke('getSystemInfo', cache),
  copyToClipboard: (): void => ipcRenderer.send('copySystemInfoToClipboard')
}

export const hasExecutable = async (executable: string) =>
  ipcRenderer.invoke('hasExecutable', executable)
