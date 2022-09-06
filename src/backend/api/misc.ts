import { GOGCloudSavesLocation } from 'common/types/gog'
import { ipcRenderer } from 'electron'
import { Runner, Tools } from '../../common/types'

//src/components/ui/errorcomponent/index.tsx
export const clearCache = () => ipcRenderer.send('clearCache')
export const resetHeroic = () => ipcRenderer.send('resetHeroic')

//src/components/ui/languageselector
export const openWeblate = () => ipcRenderer.send('openWeblate')
export const changeLanguage = (newLanguage: string) =>
  ipcRenderer.send('changeLanguage', newLanguage)

//src/components/ui/sidebar/components/heroicversion
export const openExternalUrl = (url: string) =>
  ipcRenderer.send('openExternalUrl', url)
export const getHeroicVersion = async () =>
  ipcRenderer.invoke('getHeroicVersion')
export const getLatestReleases = async () =>
  ipcRenderer.invoke('getLatestReleases')

//src/components/ui/sidebar/components/sidebarlinks/index.tsx
export const openPatreonPage = () => ipcRenderer.send('openPatreonPage')
export const openKofiPage = () => ipcRenderer.send('openKofiPage')
export const isFullscreen = async () => ipcRenderer.invoke('isFullscreen')

//src/components/ui/webviewcontrols/index.tsx
export const openWebviewPage = (url: string) =>
  ipcRenderer.send('openWebviewPage', url)

//src/frontend/state/globalstate
export const setZoomFactor = (zoom: string) =>
  ipcRenderer.send('setZoomFactor', zoom)
export const frontendReady = () => ipcRenderer.send('frontendReady')
export const lock = () => ipcRenderer.send('lock')
export const unlock = () => ipcRenderer.send('unlock')
export const login = async (sid: string) => ipcRenderer.invoke('login', sid)
export const logoutLegendary = async () => ipcRenderer.invoke('logoutLegendary')
export const authGOG = async (token: string) =>
  ipcRenderer.invoke('authGOG', token)
export const logoutGOG = async () => ipcRenderer.invoke('logoutGOG')
export const checkGameUpdates = async () =>
  ipcRenderer.invoke('checkGameUpdates')
export const refreshWineVersionInfo = async (fetch?: boolean) =>
  ipcRenderer.invoke('refreshWineVersionInfo', fetch)
export const refreshLibrary = async (
  fullRefresh?: boolean,
  library?: Runner | 'all'
) => ipcRenderer.invoke('refreshLibrary', fullRefresh, library)

//src/frontend/helpers/gamepads
export const gamepadAction = async (
  args: [action: string, metadata: { elementTag: string; x: number; y: number }]
) => ipcRenderer.invoke('gamepadAction', args)

// misc
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
) => ipcRenderer.invoke('syncGOGSaves', gogSaves, appName, arg)
export const getFonts = async (reload: boolean) =>
  ipcRenderer.invoke('getFonts', reload)
export const checkDiskSpace = async (installPath: string) =>
  ipcRenderer.invoke('checkDiskSpace', installPath)
export const getGOGLinuxInstallersLangs = async (appName: string) =>
  ipcRenderer.invoke('getGOGLinuxInstallersLangs', appName)
export const getAlternativeWine = async () =>
  ipcRenderer.invoke('getAlternativeWine')
export const getGOGGameClientId = async (appName: string) =>
  ipcRenderer.invoke('getGOGGameClientId', appName)
export const getShellPath = async (saveLocation: string) =>
  ipcRenderer.invoke('getShellPath', saveLocation)
export const getRealPath = async (actualPath: string) =>
  ipcRenderer.invoke('getRealPath', actualPath)
export const callTool = async (toolArgs: Tools) =>
  ipcRenderer.invoke('callTool', toolArgs)
export const getAnticheatInfo = async (namespace: string) =>
  ipcRenderer.invoke('getAnticheatInfo', namespace)

export const requestSettingsRemoveListeners = () =>
  ipcRenderer.removeAllListeners('requestSettings')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setGameStatusRemoveListener = (onGameStatusUpdate: any) =>
  ipcRenderer.removeListener('setGameStatus', onGameStatusUpdate)

export const clipboardReadText = async () =>
  ipcRenderer.invoke('clipboardReadText')

export const clipboardWriteText = async (text: string) =>
  ipcRenderer.send('clipboardWriteText', text)

import Store from 'electron-store'
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
