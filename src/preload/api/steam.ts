import { makeHandlerInvoker, makeListenerCaller, frontendListenerSlot } from '../ipc'

export const getSteamUserInfo = makeHandlerInvoker('getSteamUserInfo')
export const getSteamDlcInfo = makeHandlerInvoker('getSteamDlcInfo')
export const getSteamInstallLibraries = makeHandlerInvoker('getSteamInstallLibraries')
export const setSteamDlcEnabled = makeHandlerInvoker('setSteamDlcEnabled')
export const getSteamIntegrationEnabled = makeHandlerInvoker('getSteamIntegrationEnabled')
export const setSteamIntegrationEnabled = makeListenerCaller('setSteamIntegrationEnabled')
export const loginSteam = makeHandlerInvoker('loginSteam')
export const loginSteamQr = makeHandlerInvoker('loginSteamQr')
export const cancelSteamQrLogin = makeListenerCaller('cancelSteamQrLogin')
export const handleSteamQrChallenge = frontendListenerSlot('steamQrChallenge')
export const logoutSteam = makeListenerCaller('logoutSteam')
