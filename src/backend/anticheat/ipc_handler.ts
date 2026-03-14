import { backendEvents } from 'backend/backend_events'
import { addHandler } from '../ipc'
import { downloadAntiCheatData, gameAnticheatInfo } from './utils'
import { isMac } from 'backend/constants/environment'
import { logDebug, LogPrefix } from 'backend/logger'

// we use the game's `namespace` value here, it's the value that can be easily fetch by AreWeAnticheatYet
addHandler('getAnticheatInfo', async (e, appNamespace) =>
  gameAnticheatInfo(appNamespace)
)

backendEvents.on('releasesInfoReady', (releasesInfo) => {
  logDebug('Releases info ready, checking anticheat data', LogPrefix.Backend)
  void downloadAntiCheatData(
    isMac
      ? releasesInfo.anticheatFiles.shaMac
      : releasesInfo.anticheatFiles.shaLinux
  )
})
