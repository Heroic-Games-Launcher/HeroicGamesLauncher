import { makeHandlerInvoker, makeListenerCaller } from '../ipc'

export const getZoomUserInfo = makeHandlerInvoker('getZoomUserInfo')
export const authZoom = makeHandlerInvoker('authZoom')
export const logoutZoom = makeListenerCaller('logoutZoom')
