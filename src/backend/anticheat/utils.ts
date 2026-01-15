import { writeFile, readFile } from 'fs/promises'
import { logDebug, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { AntiCheatInfo } from 'common/types'
import { runOnceWhenOnline } from '../online_monitor'
import { axiosClient } from 'backend/utils'
import { join } from 'node:path'
import { appFolder } from 'backend/constants/paths'
import { isMac, isWindows } from 'backend/constants/environment'
import { createHash } from 'node:crypto'
import { createReadStream } from 'graceful-fs'
import { finished } from 'node:stream/promises'

async function createMD5(filePath: string) {
  const hash = createHash('md5')
  const rStream = createReadStream(filePath)
  rStream.pipe(hash)
  await finished(rStream)
  return hash.digest('hex')
}

const anticheatDataPath = join(appFolder, 'areweanticheatyet.json')

async function downloadAntiCheatData(latestFileHash?: string) {
  if (process.env.CI === 'e2e') return
  if (isWindows) return

  const localFileHash = await createMD5(anticheatDataPath)

  if (latestFileHash && localFileHash === latestFileHash) {
    logDebug(
      'AreWeAnticheatYet data did not change. Skipping.',
      LogPrefix.Backend
    )
    return
  }

  logDebug(
    'AreWeAnticheatYet data changed. Downloading latest file.',
    LogPrefix.Backend
  )

  runOnceWhenOnline(async () => {
    const url = isMac
      ? 'https://raw.githubusercontent.com/Heroic-Games-Launcher/MacAnticheatData/main/games.json'
      : 'https://raw.githubusercontent.com/Starz0r/AreWeAntiCheatYet/HEAD/games.json'

    try {
      const { data } = await axiosClient.get<string>(url, {
        responseType: 'text',
        transformResponse: [(d) => d] // disable JSON parsing
      })

      await writeFile(anticheatDataPath, data)
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
