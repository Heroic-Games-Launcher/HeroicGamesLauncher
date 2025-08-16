import { ipcRenderer } from 'electron'
import { ZoomCredentials } from 'common/types/zoom'

export function getZoomUserInfo(): Promise<{ username: string } | undefined> {
  return ipcRenderer.invoke('getZoomUserInfo')
}

export function authZoom(): Promise<{ status: 'done' | 'error' }> {
  return ipcRenderer.invoke('authZoom')
}

export function logoutZoom(): Promise<void> {
  return ipcRenderer.invoke('logoutZoom')
}
