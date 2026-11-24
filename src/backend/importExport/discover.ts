import { readdirSync, statSync } from 'graceful-fs'
import { join } from 'path'

import { userHome } from 'backend/constants/paths'
import { logWarning, LogPrefix } from 'backend/logger'
import type {
  HeroicBackupDiscoveryResult,
  HeroicDiscoveredBackup
} from 'common/types/importExport'

// Heroic saves exports as `heroic-backup-<timestamp>.zip` in the folder the
// user picked (the home directory by default). Only surface files that match
// that shape so unrelated zips don't clutter the wizard.
const BACKUP_FILE_PREFIX = 'heroic-backup-'
const MAX_RESULTS = 50

function isHeroicBackupFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.startsWith(BACKUP_FILE_PREFIX) && lower.endsWith('.zip')
}

export function discoverHeroicBackups(
  directory: string = userHome
): HeroicBackupDiscoveryResult {
  try {
    const backups: HeroicDiscoveredBackup[] = readdirSync(directory, {
      withFileTypes: true
    })
      .filter((entry) => entry.isFile() && isHeroicBackupFile(entry.name))
      .flatMap((entry) => {
        const path = join(directory, entry.name)
        try {
          const stats = statSync(path)
          return [
            {
              path,
              fileName: entry.name,
              modifiedAt: stats.mtimeMs,
              size: stats.size
            }
          ]
        } catch {
          return []
        }
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(0, MAX_RESULTS)

    return { directory, backups }
  } catch (err) {
    logWarning(
      [`Could not scan ${directory} for Heroic backups:`, String(err)],
      LogPrefix.ImportExport
    )
    return { directory, backups: [] }
  }
}
