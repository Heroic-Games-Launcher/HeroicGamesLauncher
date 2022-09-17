import { ipcRenderer } from '.'

export const initOnlineMonitor = () => {
  window.addEventListener('online', () => {
    ipcRenderer.send('connectivity-changed', 'check-online')
  })

  window.addEventListener('offline', () => {
    ipcRenderer.send('connectivity-changed', 'offline')
  })
}
