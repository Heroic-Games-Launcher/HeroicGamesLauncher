import { ipcRenderer } from 'electron'
import { makeHandlerInvoker, makeListenerCaller } from '../ipc'

export const getZoomUserInfo = makeHandlerInvoker('getZoomUserInfo')
export const authZoom = (url: string) => ipcRenderer.invoke('authZoom', url)
export const logoutZoom = makeListenerCaller('logoutZoom')
