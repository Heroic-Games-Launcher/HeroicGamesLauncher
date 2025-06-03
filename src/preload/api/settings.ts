import { makeListenerCaller, makeHandlerInvoker } from '../ipc'

export const requestAppSettings = makeHandlerInvoker('requestAppSettings')
export const requestGameSettings = makeHandlerInvoker('requestGameSettings')
export const setSetting = makeListenerCaller('setSetting')
export const getLegendaryVersion = makeHandlerInvoker('getLegendaryVersion')
export const getGogdlVersion = makeHandlerInvoker('getGogdlVersion')
export const getCometVersion = makeHandlerInvoker('getCometVersion')
export const getNileVersion = makeHandlerInvoker('getNileVersion')
export const getEosOverlayStatus = makeHandlerInvoker('getEosOverlayStatus')
export const getLatestEosOverlayVersion = makeHandlerInvoker('getLatestEosOverlayVersion')
export const removeEosOverlay = makeHandlerInvoker('removeEosOverlay')
export const updateEosOverlayInfo = makeHandlerInvoker('updateEosOverlayInfo')
export const changeTrayColor = makeListenerCaller('changeTrayColor')
export const getMaxCpus = makeHandlerInvoker('getMaxCpus')
export const showUpdateSetting = makeHandlerInvoker('showUpdateSetting')
export const egsSync = makeHandlerInvoker('egsSync')
export const showLogFileInFolder = makeListenerCaller('showLogFileInFolder')
export const getLogContent = makeHandlerInvoker('getLogContent')
export const systemInfo = {
  get: makeHandlerInvoker('getSystemInfo'),
  copyToClipboard: makeListenerCaller('copySystemInfoToClipboard')
}
export const hasExecutable = makeHandlerInvoker('hasExecutable')
