import { anticheatDataPath, isWindows } from '../constants'
import * as axios from 'axios'
import { logInfo, LogPrefix, logWarning } from '../logger/logger'
import { readFileSync, writeFileSync } from 'graceful-fs'
import { AntiCheatInfo } from 'common/types'
import { runOnceWhenOnline } from '../online_monitor'

async function downloadAntiCheatData() {
  if (isWindows) return

  runOnceWhenOnline(async () => {
    try {
      const { data } = await axios.default.get(
        'https://raw.githubusercontent.com/Starz0r/AreWeAntiCheatYet/HEAD/games.json'
      )
      writeFileSync(anticheatDataPath, JSON.stringify(data, null, 2))
      logInfo(`AreWeAntiCheatYet data downloaded`, LogPrefix.Backend)
    } catch (error) {
      logWarning(
        `Failed download of AreWeAntiCheatYet data: ${error}`,
        LogPrefix.Backend
      )
    }
  })
}

function gameAnticheatInfo(
  appNamespace: string | undefined
): AntiCheatInfo | null {
  if (appNamespace === undefined) return null
  if (isWindows) return null

  const data = readFileSync(anticheatDataPath)
  const jsonData = JSON.parse(data.toString())
  return jsonData.find((info: AntiCheatInfo) => {
    const namespace = info.storeIds.epic?.namespace
    if (namespace) {
      return namespace.toLowerCase().includes(appNamespace)
    } else {
      return false
    }
  })
}

export { downloadAntiCheatData, gameAnticheatInfo }
