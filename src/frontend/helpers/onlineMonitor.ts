export const initOnlineMonitor = () => {
  window.addEventListener('online', () => {
    window.api.connectivityChanged('check-online')
  })

  window.addEventListener('offline', () => {
    window.api.connectivityChanged('offline')
  })
}
