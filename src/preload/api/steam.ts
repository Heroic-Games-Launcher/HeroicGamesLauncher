import { makeHandlerInvoker, makeListenerCaller } from '../ipc'

export const getSteamUserInfo = makeHandlerInvoker('getSteamUserInfo')
export const authSteam = makeHandlerInvoker('authSteam')
export const logoutSteam = makeListenerCaller('logoutSteam')
