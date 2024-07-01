import { Runner, GameStatus } from 'common/types'
import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi,
  frontendListenerSlot as fls
} from 'common/ipc/frontend'

export const removeFolder = lc('removeFolder')

export const openDialog = hi('openDialog')

export const uninstall = async (
  appName: string,
  runner: Runner,
  shouldRemovePrefix: boolean,
  shouldRemoveSetting: boolean
) => {
  if (runner === 'sideload') {
    return ipcRenderer.invoke('removeApp', {
      appName,
      shouldRemovePrefix,
      runner
    })
  } else {
    return ipcRenderer.invoke(
      'uninstall',
      appName,
      runner,
      shouldRemovePrefix,
      shouldRemoveSetting
    )
  }
}

export const repair = hi('repair')

export const launch = hi('launch')

export const importGame = hi('importGame')

export const handleGameStatus = fls('gameStatusUpdate')

export const onProgressUpdate = (
  appName: string,
  onChange: (e: Electron.IpcRendererEvent, status: GameStatus) => void
) => {
  ipcRenderer.on(`progressUpdate-${appName}`, onChange)
  return () => {
    ipcRenderer.removeListener(`progressUpdate-${appName}`, onChange)
  }
}

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
