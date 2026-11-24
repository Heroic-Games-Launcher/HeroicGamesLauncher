import { backendEvents } from 'backend/backend_events'
import { addHandler } from '../ipc'
import { downloadFileIfNeeded, getKnownFixesFor } from './utils'
import { logDebug, LogPrefix } from 'backend/logger'

addHandler('getKnownFixes', (e, appName, runner) =>
  getKnownFixesFor(appName, runner)
)

backendEvents.on('releasesInfoReady', (releasesInfo) => {
  logDebug('Releases info ready, checking known fixes data', LogPrefix.Backend)
  void downloadFileIfNeeded(releasesInfo.knownFixesSha)
})
