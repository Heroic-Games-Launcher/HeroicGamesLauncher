import { writeFile, readFile } from 'fs/promises'
import { logInfo, LogPrefix, logWarning } from 'backend/logger'
import { AntiCheatInfo } from 'common/types'
import { runOnceWhenOnline } from '../online_monitor'
import { axiosClient } from 'backend/utils'
import { join } from 'node:path'
import { appFolder } from 'backend/constants/paths'
import { isMac, isWindows } from 'backend/constants/environment'

const anticheatDataPath = join(appFolder, 'areweanticheatyet.json')

function downloadAntiCheatData() {
  if (process.env.CI === 'e2e') return
  if (isWindows) return

  runOnceWhenOnline(async () => {
    const url = isMac
      ? 'https://raw.githubusercontent.com/Heroic-Games-Launcher/MacAnticheatData/main/games.json'
      : 'https://raw.githubusercontent.com/Starz0r/AreWeAntiCheatYet/HEAD/games.json'

    try {
      const { data } = await axiosClient.get(url)
      await writeFile(anticheatDataPath, JSON.stringify(data, null, 2))
      logInfo(`AreWeAntiCheatYet data downloaded`, LogPrefix.Backend)
    } catch (error) {
      logWarning(
        `Failed download of AreWeAntiCheatYet data: ${error}`,
        LogPrefix.Backend
      )
    }
  })
}

async function gameAnticheatInfo(
  appNamespace: string | undefined
): Promise<AntiCheatInfo | null> {
  if (appNamespace === undefined) return null
  if (isWindows) return null

  try {
    const data = await readFile(anticheatDataPath, 'utf-8')
    const jsonData = JSON.parse(data)
    return jsonData.find((info: AntiCheatInfo) => {
      const namespace = info.storeIds.epic?.namespace
      if (namespace) {
        return namespace.toLowerCase().includes(appNamespace)
      } else {
        return false
      }
    })
  } catch (err) {
    logWarning(
      ['Failed to read AreWeAntiCheatYet file:', err],
      LogPrefix.Backend
    )
    return null
  }
}

export { downloadAntiCheatData, gameAnticheatInfo }
