import { makeHandlerInvoker, makeListenerCaller, frontendListenerSlot } from '../ipc'

export const getSteamUserInfo = makeHandlerInvoker('getSteamUserInfo')
export const getSteamDlcInfo = makeHandlerInvoker('getSteamDlcInfo')
export const setSteamDlcEnabled = makeHandlerInvoker('setSteamDlcEnabled')
export const loginSteam = makeHandlerInvoker('loginSteam')
export const loginSteamQr = makeHandlerInvoker('loginSteamQr')
export const cancelSteamQrLogin = makeListenerCaller('cancelSteamQrLogin')
export const handleSteamQrChallenge = frontendListenerSlot('steamQrChallenge')
export const logoutSteam = makeListenerCaller('logoutSteam')
