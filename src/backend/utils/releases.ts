import { backendEvents } from 'backend/backend_events'
import { isWindows } from 'backend/constants/environment'
import { LogPrefix, logWarning } from 'backend/logger'
import { runOnceWhenOnline } from 'backend/online_monitor'
import { axiosClient } from 'backend/utils'
import { ReleasesInfo } from 'common/types'

// fetch latest versions of wine/proton/gptk and anticheat data if needed
export const fetchLastestReleases = () => {
  if (process.env.CI === 'e2e') return
  if (isWindows) return

  runOnceWhenOnline(async () => {
    const url =
      'https://raw.githubusercontent.com/Heroic-Games-Launcher/releases-info/refs/heads/main/release-data.json'

    try {
      const { data } = await axiosClient.get<ReleasesInfo>(url)
      backendEvents.emit('releasesInfoReady', data)
    } catch (error) {
      logWarning(
        `Failed download of information about latest releases: ${error}`,
        LogPrefix.Backend
      )
    }
  })
}
