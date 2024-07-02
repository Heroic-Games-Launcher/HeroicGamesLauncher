import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi,
  frontendListenerSlot as fls
} from 'common/ipc/frontend'

export const removeFolder = lc('removeFolder')

export const openDialog = hi('openDialog')

export const uninstall = hi('uninstall')

export const repair = hi('repair')

export const launch = hi('launch')

export const importGame = hi('importGame')

export const handleGameStatus = fls('gameStatusUpdate')

export const onProgressUpdate = fls('progressUpdate')

export const handleLaunchGame = fls('launchGame')

export const handleInstallGame = fls('installGame')

export const handleRefreshLibrary = fls('refreshLibrary')

export const handleGamePush = fls('pushGameToLibrary')

export const removeRecentGame = hi('removeRecent')

export const handleRecentGamesChanged = fls('recentGamesChanged')

export const addNewApp = lc('addNewApp')

export const changeGameVersionPinnedStatus = lc('changeGameVersionPinnedStatus')

export const getGameOverride = hi('getGameOverride')

export const getGameSdl = hi('getGameSdl')
