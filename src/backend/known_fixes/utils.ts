import { KnownFixesFile, Runner } from 'common/types'
import { existsSync, readFileSync } from 'graceful-fs'
import { storeMap } from 'common/utils'
import { appFolder } from 'backend/constants/paths'
import { logDebug, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { createMD5 } from 'backend/utils/releases'
import { runOnceWhenOnline } from 'backend/online_monitor'
import { axiosClient } from 'backend/utils'
import { writeFile } from 'fs/promises'
import { join } from 'path'

const fixesPath = join(appFolder, 'known_fixes.json')

export function getKnownFixesFor(appName: string, runner: Runner) {
  if (runner === 'sideload') return null
  if (!existsSync(fixesPath)) return null

  try {
    const fixesContent = JSON.parse(
      readFileSync(fixesPath).toString()
    ) as KnownFixesFile

    return fixesContent[storeMap[runner] as keyof KnownFixesFile][appName]
  } catch (error) {
    // if we fail to download the json file, it can be malformed causing
    // JSON.parse to throw an exception
    logWarning(['Known fixes could not be loaded, ignoring.', error])
    return null
  }
}

export async function downloadFileIfNeeded(latestFileHash: string) {
  if (process.env.CI === 'e2e') return

  const localFileHash = await createMD5(fixesPath)

  if (latestFileHash && localFileHash === latestFileHash) {
    logDebug('Known Fixes data did not change. Skipping.', LogPrefix.Backend)
    return
  }

  logDebug(
    'Known Fixes data changed. Downloading latest file.',
    LogPrefix.Backend
  )

  runOnceWhenOnline(async () => {
    const url =
      'https://raw.githubusercontent.com/Heroic-Games-Launcher/known-fixes/main/known_fixes.json'

    try {
      const { data } = await axiosClient.get<string>(url, {
        responseType: 'text',
        transformResponse: [(d) => d] // disable JSON parsing
      })

      await writeFile(fixesPath, data)
      logInfo(`Known Fixes data downloaded`, LogPrefix.Backend)
    } catch (error) {
      logWarning(
        `Failed download of Known Fixes data: ${error}`,
        LogPrefix.Backend
      )
    }
  })
}
