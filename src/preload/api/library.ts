import { makeListenerCaller, makeHandlerInvoker, frontendListenerSlot } from '../ipc'

export const removeFolder = makeListenerCaller('removeFolder')
export const openDialog = makeHandlerInvoker('openDialog')
export const uninstall = makeHandlerInvoker('uninstall')
export const repair = makeHandlerInvoker('repair')
export const launch = makeHandlerInvoker('launch')
export const importGame = makeHandlerInvoker('importGame')
export const handleGameStatus = frontendListenerSlot('gameStatusUpdate')
export const onProgressUpdate = frontendListenerSlot('progressUpdate')
export const handleInstallGame = frontendListenerSlot('installGame')
export const handleRefreshLibrary = frontendListenerSlot('refreshLibrary')
export const handleGamePush = frontendListenerSlot('pushGameToLibrary')
export const removeRecentGame = makeHandlerInvoker('removeRecent')
export const handleRecentGamesChanged = frontendListenerSlot('recentGamesChanged')
export const addNewApp = makeListenerCaller('addNewApp')
export const changeGameVersionPinnedStatus = makeListenerCaller('changeGameVersionPinnedStatus')
export const getGameOverride = makeHandlerInvoker('getGameOverride')
export const getGameSdl = makeHandlerInvoker('getGameSdl')
export const installSteamWindows = makeHandlerInvoker('installSteamWindows')
export const libraries = {
  getAll: makeHandlerInvoker('libraries__getAll'),
  add: makeHandlerInvoker('libraries__add'),
  rename: makeHandlerInvoker('libraries__rename'),
  delete: makeHandlerInvoker('libraries__delete'),
  readInfoForPath: makeHandlerInvoker('libraries__readInfoForPath'),
  onLibraryPush: frontendListenerSlot('pushLibrary'),
  onLibraryDelete: frontendListenerSlot('removeLibrary')
}
