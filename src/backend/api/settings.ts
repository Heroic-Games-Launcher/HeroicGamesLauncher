import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi
} from 'common/ipc/frontend'

export const requestAppSettings = hi('requestAppSettings')

export const requestGameSettings = hi('requestGameSettings')

export const setSetting = lc('setSetting')

export const getLegendaryVersion = hi('getLegendaryVersion')
export const getGogdlVersion = hi('getGogdlVersion')
export const getNileVersion = hi('getNileVersion')
export const getEosOverlayStatus = hi('getEosOverlayStatus')
export const getLatestEosOverlayVersion = hi('getLatestEosOverlayVersion')
export const removeEosOverlay = hi('removeEosOverlay')
export const updateEosOverlayInfo = hi('updateEosOverlayInfo')

export const changeTrayColor = lc('changeTrayColor')
export const getMaxCpus = hi('getMaxCpus')
export const showUpdateSetting = hi('showUpdateSetting')
export const egsSync = hi('egsSync')

export const showLogFileInFolder = lc('showLogFileInFolder')
export const getLogContent = hi('getLogContent')

export const systemInfo = {
  get: hi('getSystemInfo'),
  copyToClipboard: lc('copySystemInfoToClipboard')
}

export const hasExecutable = hi('hasExecutable')
