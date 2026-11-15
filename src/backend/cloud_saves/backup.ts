import { createHash } from 'crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'graceful-fs'
import { dirname, join, relative, sep } from 'path'

import type { Runner } from 'common/types'
import { GlobalConfig } from '../config'
import { logInfo, LogPrefix } from 'backend/logger'

interface FileState {
  size: number
  mtimeMs: number
}

interface BackupManifest {
  version: 1
  appName: string
  title: string
  location: string
  files: Record<string, FileState>
  createdAt: string
}

const toPosixPath = (path: string) => path.split(sep).join('/')

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\p{Cc}]/gu

export const getBackupFolderName = (
  title: string | undefined,
  appName: string
): string => {
  const sanitized = (title ?? '')
    .replace(INVALID_FILENAME_CHARS, '_')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 120)
  return sanitized || appName
}

const collectFiles = (root: string): Record<string, FileState> => {
  const files: Record<string, FileState> = {}

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(absolute)
      } else if (entry.isFile()) {
        const stat = statSync(absolute)
        files[toPosixPath(relative(root, absolute))] = {
          size: stat.size,
          mtimeMs: stat.mtimeMs
        }
      }
    }
  }

  walk(root)
  return files
}

const readManifest = (dir: string): BackupManifest | undefined => {
  try {
    return JSON.parse(
      readFileSync(join(dir, 'manifest.json'), 'utf-8')
    ) as BackupManifest
  } catch {
    return undefined
  }
}

export const getChangedFiles = (
  previous: Record<string, FileState> | undefined,
  current: Record<string, FileState>
): string[] =>
  Object.keys(current).filter((file) => {
    const previousFile = previous?.[file]
    return (
      !previousFile ||
      previousFile.size !== current[file].size ||
      previousFile.mtimeMs !== current[file].mtimeMs
    )
  })

export const backupSaveLocations = ({
  appName,
  title,
  locations,
  backupRoot
}: {
  appName: string
  title?: string
  locations: string[]
  backupRoot: string
}): void => {
  const folderName = getBackupFolderName(title, appName)
  let appBackupRoot = join(backupRoot, folderName)

  try {
    const marker = JSON.parse(
      readFileSync(join(appBackupRoot, 'app.json'), 'utf-8')
    ) as { appName?: string }
    if (marker.appName && marker.appName !== appName) {
      appBackupRoot = join(backupRoot, `${folderName} (${appName})`)
    }
  } catch {
    // No marker yet, the folder name is free.
  }

  for (const location of locations) {
    if (
      !location ||
      !existsSync(location) ||
      !statSync(location).isDirectory()
    ) {
      continue
    }

    const locationKey = createHash('md5')
      .update(location)
      .digest('hex')
      .slice(0, 8)
    const locationDir = join(appBackupRoot, locationKey)
    if (locationDir.startsWith(location)) {
      continue
    }

    const current = collectFiles(location)
    const previous = readManifest(locationDir)
    const changed = getChangedFiles(previous?.files, current)
    const deleted = previous
      ? Object.keys(previous.files).filter((file) => !(file in current))
      : []

    if (!changed.length && !deleted.length) {
      continue
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    let createdAt = timestamp
    let snapshotDir = join(locationDir, createdAt)
    for (let suffix = 1; existsSync(snapshotDir); suffix++) {
      createdAt = `${timestamp}-${suffix}`
      snapshotDir = join(locationDir, createdAt)
    }
    for (const file of changed) {
      const destination = join(snapshotDir, 'files', file)
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(join(location, file), destination)
    }

    mkdirSync(snapshotDir, { recursive: true })
    writeFileSync(
      join(snapshotDir, 'snapshot.json'),
      JSON.stringify(
        { createdAt, appName, title, location, changed, deleted },
        null,
        2
      )
    )
    writeFileSync(
      join(locationDir, 'manifest.json'),
      JSON.stringify(
        { version: 1, appName, title, location, files: current, createdAt },
        null,
        2
      )
    )
    writeFileSync(
      join(appBackupRoot, 'app.json'),
      JSON.stringify({ appName, title }, null, 2)
    )
    logInfo(
      [
        'Backed up',
        `${changed.length}`,
        'changed save files for',
        appName,
        'to',
        snapshotDir
      ],
      LogPrefix.Backend
    )
  }
}

export const backupSaves = ({
  appName,
  title,
  locations
}: {
  appName: string
  title?: string
  runner: Runner
  locations: string[]
}): void => {
  const { backupSaves: enabled, defaultInstallPath } =
    GlobalConfig.get().getSettings()
  if (!enabled) {
    return
  }

  backupSaveLocations({
    appName,
    title,
    locations,
    backupRoot: join(defaultInstallPath, 'Saves_Backup')
  })
}
