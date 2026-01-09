import { downloadAntiCheatData } from 'backend/anticheat/utils'
import { isMac, isWindows } from 'backend/constants/environment'
import { LogPrefix, logWarning } from 'backend/logger'
import { runOnceWhenOnline } from 'backend/online_monitor'
import { axiosClient } from 'backend/utils'
import { updateWineListsIfOutdated } from 'backend/wine/manager/utils'

export interface ReleasesData {
  'game-porting-toolkit': {
    tag: string
    published_at: string
  }
  'wine-staging': {
    tag: string
    published_at: string
  }
  'wine-ge': {
    tag: string
    published_at: string
  }
  'ge-proton': {
    tag: string
    published_at: string
  }
  'wine-crossover': {
    tag: string
    published_at: string
  }
  anticheatFiles: {
    shaMac: string
    shaLinux: string
  }
}

// fetch latest versions of wine/proton/gptk and anticheat data if needed
export const fetchLastestReleases = () => {
  if (process.env.CI === 'e2e') return
  if (isWindows) return

  runOnceWhenOnline(async () => {
    const url =
      'https://raw.githubusercontent.com/Heroic-Games-Launcher/releases-info/refs/heads/main/release-data.json'

    try {
      const { data } = await axiosClient.get<ReleasesData>(url)
      void downloadAntiCheatData(
        isMac ? data.anticheatFiles.shaMac : data.anticheatFiles.shaLinux
      )
      updateWineListsIfOutdated(data)
    } catch (error) {
      logWarning(
        `Failed download of information about latest releases: ${error}`,
        LogPrefix.Backend
      )
    }
  })
}
