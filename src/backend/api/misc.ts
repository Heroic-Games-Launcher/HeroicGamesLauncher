import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi,
  frontendListenerSlot as fls
} from 'common/ipc/frontend'

export const clearCache = lc('clearCache')
export const resetHeroic = lc('resetHeroic')

export const openWeblate = lc('openWeblate')
export const changeLanguage = lc('changeLanguage')

export const openExternalUrl = lc('openExternalUrl')
export const getHeroicVersion = hi('getHeroicVersion')
export const getLatestReleases = hi('getLatestReleases')
export const getCurrentChangelog = hi('getCurrentChangelog')

export const openPatreonPage = lc('openPatreonPage')
export const openKofiPage = lc('openKofiPage')
export const isFullscreen = hi('isFullscreen')
export const isFrameless = hi('isFrameless')
export const isMinimized = hi('isMinimized')
export const isMaximized = hi('isMaximized')
export const minimizeWindow = lc('minimizeWindow')
export const maximizeWindow = lc('maximizeWindow')
export const unmaximizeWindow = lc('unmaximizeWindow')
export const closeWindow = lc('closeWindow')
export const handleMaximized = fls('maximized')
export const handleUnmaximized = fls('unmaximized')
export const handleFullscreen = fls('fullscreen')

export const openWebviewPage = lc('openWebviewPage')

export const setZoomFactor = lc('setZoomFactor')
export const frontendReady = lc('frontendReady')
export const lock = lc('lock')
export const unlock = lc('unlock')
export const login = hi('login')
export const logoutLegendary = hi('logoutLegendary')
export const authGOG = hi('authGOG')
export const logoutGOG = lc('logoutGOG')
export const getAmazonLoginData = hi('getAmazonLoginData')
export const authAmazon = hi('authAmazon')
export const logoutAmazon = hi('logoutAmazon')
export const checkGameUpdates = hi('checkGameUpdates')
export const refreshLibrary = hi('refreshLibrary')

export const gamepadAction = hi('gamepadAction')

export const logError = lc('logError')
export const logInfo = lc('logInfo')
export const showConfigFileInFolder = lc('showConfigFileInFolder')
export const openFolder = lc('openFolder')
export const syncGOGSaves = hi('syncGOGSaves')
export const getFonts = hi('getFonts')
export const checkDiskSpace = hi('checkDiskSpace')
export const getGOGLinuxInstallersLangs = hi('getGOGLinuxInstallersLangs')
export const getAlternativeWine = hi('getAlternativeWine')
export const getLocalPeloadPath = hi('getLocalPeloadPath')
export const getShellPath = hi('getShellPath')
export const callTool = hi('callTool')
export const getAnticheatInfo = hi('getAnticheatInfo')

export const clipboardReadText = hi('clipboardReadText')

export const clipboardWriteText = lc('clipboardWriteText')

export const pathExists = hi('pathExists')

export const processShortcut = lc('processShortcut')

export const handleGoToScreen = fls('openScreen')

export const handleShowDialog = fls('showDialog')

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

export const storeDelete = (storeName: string, key: string) =>
  stores[storeName].delete(key)

export const getWikiGameInfo = hi('getWikiGameInfo')

export const fetchPlaytimeFromServer = hi('getPlaytimeFromRunner')
