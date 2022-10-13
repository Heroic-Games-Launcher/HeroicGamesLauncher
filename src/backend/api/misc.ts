import { GOGCloudSavesLocation } from 'common/types/gog'
import { ipcRenderer } from 'electron'
import {
  AntiCheatInfo,
  DiskSpaceData,
  Release,
  Runner,
  Tools,
  UserInfo,
  WineInstallation
} from 'common/types'

export const clearCache = () => ipcRenderer.send('clearCache')
export const resetHeroic = () => ipcRenderer.send('resetHeroic')

export const openWeblate = () => ipcRenderer.send('openWeblate')
export const changeLanguage = (newLanguage: string) =>
  ipcRenderer.send('changeLanguage', newLanguage)

export const openExternalUrl = (url: string) =>
  ipcRenderer.send('openExternalUrl', url)
export const getHeroicVersion = async (): Promise<string> =>
  ipcRenderer.invoke('getHeroicVersion')
export const getLatestReleases = async (): Promise<Release[]> =>
  ipcRenderer.invoke('getLatestReleases')

export const openPatreonPage = () => ipcRenderer.send('openPatreonPage')
export const openKofiPage = () => ipcRenderer.send('openKofiPage')
export const isFullscreen = async (): Promise<boolean> =>
  ipcRenderer.invoke('isFullscreen')

export const openWebviewPage = (url: string) =>
  ipcRenderer.send('openWebviewPage', url)

export const setZoomFactor = (zoom: string) =>
  ipcRenderer.send('setZoomFactor', zoom)
export const frontendReady = () => ipcRenderer.send('frontendReady')
export const lock = () => ipcRenderer.send('lock')
export const unlock = () => ipcRenderer.send('unlock')
export const login = async (
  sid: string
): Promise<{
  status: 'done' | 'failed'
  data: UserInfo | undefined
}> => ipcRenderer.invoke('login', sid)
export const logoutLegendary = async (): Promise<void> =>
  ipcRenderer.invoke('logoutLegendary')
export const authGOG = async (
  token: string
): Promise<{
  status: 'done' | 'error'
  data?: { displayName: string; username: string }
}> => ipcRenderer.invoke('authGOG', token)
export const logoutGOG = () => ipcRenderer.send('logoutGOG')
export const checkGameUpdates = async (): Promise<string[]> =>
  ipcRenderer.invoke('checkGameUpdates')
export const refreshLibrary = async (
  fullRefresh?: boolean,
  library?: Runner | 'all'
): Promise<void> => ipcRenderer.invoke('refreshLibrary', fullRefresh, library)

export const gamepadAction = async (
  args: [action: string, metadata: { elementTag: string; x: number; y: number }]
): Promise<void> => ipcRenderer.invoke('gamepadAction', args)

export const logError = (error: string) => ipcRenderer.send('logError', error)
export const logInfo = (info: string) => ipcRenderer.send('logInfo', info)
export const showConfigFileInFolder = (appName: string) =>
  ipcRenderer.send('showConfigFileInFolder', appName)
export const openFolder = (installPath: string) =>
  ipcRenderer.send('openFolder', installPath)
export const syncGOGSaves = async (
  gogSaves: GOGCloudSavesLocation[],
  appName: string,
  arg: string
): Promise<string> => ipcRenderer.invoke('syncGOGSaves', gogSaves, appName, arg)
export const getFonts = async (reload: boolean): Promise<string[]> =>
  ipcRenderer.invoke('getFonts', reload)
export const checkDiskSpace = async (
  installPath: string
): Promise<DiskSpaceData> => ipcRenderer.invoke('checkDiskSpace', installPath)
export const getGOGLinuxInstallersLangs = async (
  appName: string
): Promise<string[]> =>
  ipcRenderer.invoke('getGOGLinuxInstallersLangs', appName)
export const getAlternativeWine = async (): Promise<WineInstallation[]> =>
  ipcRenderer.invoke('getAlternativeWine')
export const getGOGGameClientId = async (
  appName: string
): Promise<string | undefined> =>
  ipcRenderer.invoke('getGOGGameClientId', appName)
export const getShellPath = async (saveLocation: string): Promise<string> =>
  ipcRenderer.invoke('getShellPath', saveLocation)
export const getRealPath = async (actualPath: string): Promise<string> =>
  ipcRenderer.invoke('getRealPath', actualPath)
export const callTool = async (toolArgs: Tools): Promise<void> =>
  ipcRenderer.invoke('callTool', toolArgs)
export const getAnticheatInfo = async (
  namespace: string
): Promise<AntiCheatInfo | null> =>
  ipcRenderer.invoke('getAnticheatInfo', namespace)

export const clipboardReadText = async (): Promise<string> =>
  ipcRenderer.invoke('clipboardReadText')

export const clipboardWriteText = async (text: string) =>
  ipcRenderer.send('clipboardWriteText', text)

export const handleShowErrorDialog = (
  onError: (e: Electron.IpcRendererEvent, title: string, error: string) => void
): (() => void) => {
  ipcRenderer.on('showErrorDialog', onError)
  return () => {
    ipcRenderer.removeListener('showErrorDialog', onError)
  }
}

import Store from 'electron-store'
// FUTURE WORK
// here is how the store methods can be refactored
// in order to set nodeIntegration: false
// but converting sync methods to async propagates through frontend

// export const storeNew = async (
//   name: string,
//   options: Store.Options<Record<string, unknown>>
// ) => ipcRenderer.send('storeNew', name, options)

// export const storeSet = async (name: string, key: string, value?: unknown) =>
//   ipcRenderer.send('storeSet', name, key, value)

// export const storeHas = async (name: string, key: string) =>
//   ipcRenderer.invoke('storeHas', name, key)

// export const storeGet = async (name: string, key: string) =>
//   ipcRenderer.invoke('storeGet', name, key)

interface StoreMap {
  [key: string]: Store
}
const stores: StoreMap = {}

export const storeNew = function (
  storeName: string,
  options: Store.Options<Record<string, unknown>>
) {
  stores[storeName] = new Store(options)
}

export const storeSet = (storeName: string, key: string, value?: unknown) =>
  stores[storeName].set(key, value)

export const storeHas = (storeName: string, key: string) =>
  stores[storeName].has(key)

export const storeGet = (
  storeName: string,
  key: string,
  defaultValue?: unknown
) => stores[storeName].get(key, defaultValue)
