import { createHash } from 'crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'graceful-fs'
import { dirname, join, relative, sep } from 'path'

import type { Runner, SaveBackupEntry } from 'common/types'
import { parseBackupDate } from 'common/utils'
import { GlobalConfig } from '../config'
import { logInfo, logWarning, LogPrefix } from 'backend/logger'

interface FileState {
  size: number
  mtimeMs: number
  hash?: string
}

interface BackupManifest {
  version: 1
  appName: string
  title: string
  location: string
  files: Record<string, FileState>
  createdAt: string
  stateHash?: string
}

const toPosixPath = (path: string) => path.split(sep).join('/')

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\p{Cc}]/gu

const GIGABYTE = 1024 * 1024 * 1024

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

const fileHash = (path: string) =>
  createHash('md5').update(readFileSync(path)).digest('hex')

const collectFiles = (
  root: string,
  previous?: Record<string, FileState>
): Record<string, FileState> => {
  const files: Record<string, FileState> = {}

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(absolute)
      } else if (entry.isFile()) {
        const stat = statSync(absolute)
        const relativePath = toPosixPath(relative(root, absolute))
        const previousFile = previous?.[relativePath]
        files[relativePath] = {
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          hash:
            previousFile &&
            previousFile.size === stat.size &&
            previousFile.mtimeMs === stat.mtimeMs &&
            previousFile.hash
              ? previousFile.hash
              : fileHash(absolute)
        }
      }
    }
  }

  walk(root)
  return files
}

const stateHash = (files: Record<string, FileState>): string =>
  createHash('md5')
    .update(
      Object.keys(files)
        .sort()
        .map((file) => `${file}:${files[file].hash ?? ''}`)
        .join('\n')
    )
    .digest('hex')

const locationStateHash = (
  location: string,
  previous?: Record<string, FileState>
): string | undefined => {
  if (!location || !existsSync(location)) {
    return undefined
  }

  try {
    if (!statSync(location).isDirectory()) {
      return undefined
    }
  } catch {
    return undefined
  }

  return stateHash(collectFiles(location, previous))
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

const sumStoredSaveSize = (dir: string, insideFiles = false): number => {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += sumStoredSaveSize(
        absolute,
        insideFiles || entry.name === 'files'
      )
    } else if (insideFiles && entry.isFile()) {
      total += statSync(absolute).size
    }
  }
  return total
}

const appSnapshots = (appBackupRoot: string) => {
  const snapshots: {
    locationDir: string
    dir: string
    folderName: string
    snapshot: SnapshotInfo
  }[] = []

  for (const entry of readdirSync(appBackupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const locationDir = join(appBackupRoot, entry.name)
    for (const snapshot of readSnapshots(locationDir)) {
      snapshots.push({ locationDir, ...snapshot })
    }
  }

  return snapshots.sort((a, b) =>
    a.snapshot.createdAt.localeCompare(b.snapshot.createdAt)
  )
}

const carrySnapshot = (
  source: { dir: string; snapshot: SnapshotInfo },
  target: { dir: string; snapshot: SnapshotInfo }
) => {
  const changed = new Set(target.snapshot.changed ?? [])
  const carried = new Set(target.snapshot.carried ?? [])
  const deleted = new Set(target.snapshot.deleted ?? [])

  for (const file of [
    ...(source.snapshot.carried ?? []),
    ...(source.snapshot.changed ?? [])
  ]) {
    if (changed.has(file) || carried.has(file)) continue
    const sourceFile = join(source.dir, 'files', file)
    if (!existsSync(sourceFile)) continue
    const destination = join(target.dir, 'files', file)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(sourceFile, destination)
    carried.add(file)
  }

  for (const file of source.snapshot.deleted ?? []) {
    if (!changed.has(file)) {
      deleted.add(file)
    }
  }

  target.snapshot.carried = [...carried]
  target.snapshot.deleted = [...deleted]
  writeFileSync(
    join(target.dir, 'snapshot.json'),
    JSON.stringify(target.snapshot, null, 2)
  )
}

const pruneBackups = (appBackupRoot: string, maxBytes: number) => {
  if (!existsSync(appBackupRoot)) return

  let total = sumStoredSaveSize(appBackupRoot)
  let snapshots = appSnapshots(appBackupRoot)

  while (total > maxBytes) {
    const locationCounts = new Map<string, number>()
    for (const snapshot of snapshots) {
      locationCounts.set(
        snapshot.locationDir,
        (locationCounts.get(snapshot.locationDir) ?? 0) + 1
      )
    }

    const target = snapshots.find(
      (snapshot) => (locationCounts.get(snapshot.locationDir) ?? 0) > 1
    )
    if (!target) {
      break
    }

    const locationSnapshots = snapshots.filter(
      (snapshot) => snapshot.locationDir === target.locationDir
    )
    const index = locationSnapshots.findIndex(
      (snapshot) => snapshot.dir === target.dir
    )
    const next = locationSnapshots[index + 1]

    if (next) {
      carrySnapshot(target, next)
    }

    rmSync(target.dir, { recursive: true, force: true })
    snapshots = snapshots.filter((snapshot) => snapshot.dir !== target.dir)
    total = sumStoredSaveSize(appBackupRoot)
    logInfo(
      [
        'Removed old save backup',
        target.dir,
        'to stay within the backup size limit'
      ],
      LogPrefix.Backend
    )
  }

  if (total > maxBytes) {
    logWarning(
      ['Save backups for this game still exceed the size limit', `${total}`],
      LogPrefix.Backend
    )
  }
}

export const backupSaveLocations = ({
  appName,
  title,
  locations,
  backupRoot,
  maxBytes = GIGABYTE
}: {
  appName: string
  title?: string
  locations: string[]
  backupRoot: string
  maxBytes?: number
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

    const previous = readManifest(locationDir)
    const current = collectFiles(location, previous?.files)
    const currentStateHash = stateHash(current)
    const changed = getChangedFiles(previous?.files, current)
    const deleted = previous
      ? Object.keys(previous.files).filter((file) => !(file in current))
      : []

    if (!changed.length && !deleted.length) {
      continue
    }

    const createdAt = new Date().toISOString()
    const folderBase = createdAt.replace(/[:.]/g, '-')
    let folderName = folderBase
    let snapshotDir = join(locationDir, folderName)
    for (let suffix = 1; existsSync(snapshotDir); suffix++) {
      folderName = `${folderBase}-${suffix}`
      snapshotDir = join(locationDir, folderName)
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
        {
          createdAt,
          appName,
          title,
          location,
          changed,
          deleted,
          stateHash: currentStateHash
        },
        null,
        2
      )
    )
    writeFileSync(
      join(locationDir, 'manifest.json'),
      JSON.stringify(
        {
          version: 1,
          appName,
          title,
          location,
          files: current,
          createdAt,
          stateHash: currentStateHash
        },
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

  pruneBackups(appBackupRoot, maxBytes)
}

export const backupSaves = ({
  appName,
  title,
  locations,
  force = false
}: {
  appName: string
  title?: string
  runner: Runner
  locations: string[]
  force?: boolean
}): void => {
  const {
    backupSaves: enabled,
    maxSaveBackupSize,
    defaultInstallPath
  } = GlobalConfig.get().getSettings()
  if (!enabled && !force) {
    return
  }

  backupSaveLocations({
    appName,
    title,
    locations,
    backupRoot: join(defaultInstallPath, 'Saves_Backup'),
    maxBytes: Math.max(maxSaveBackupSize || 1, 1) * GIGABYTE
  })
}

interface SnapshotInfo {
  createdAt: string
  location: string
  changed?: string[]
  carried?: string[]
  deleted?: string[]
  stateHash?: string
}

const getBackupRoot = () =>
  join(GlobalConfig.get().getSettings().defaultInstallPath, 'Saves_Backup')

const findAppBackupFolders = (
  appName: string,
  backupRoot: string
): string[] => {
  const folders: string[] = []
  if (!existsSync(backupRoot)) {
    return folders
  }

  for (const entry of readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const appDir = join(backupRoot, entry.name)
    try {
      const marker = JSON.parse(
        readFileSync(join(appDir, 'app.json'), 'utf-8')
      ) as { appName?: string }
      if (marker.appName === appName) {
        folders.push(appDir)
      }
    } catch {
      continue
    }
  }

  return folders
}

const readSnapshots = (
  locationDir: string
): { dir: string; folderName: string; snapshot: SnapshotInfo }[] => {
  const snapshots: {
    dir: string
    folderName: string
    snapshot: SnapshotInfo
  }[] = []

  if (!existsSync(locationDir)) {
    return snapshots
  }

  for (const entry of readdirSync(locationDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(locationDir, entry.name)
    try {
      const snapshot = JSON.parse(
        readFileSync(join(dir, 'snapshot.json'), 'utf-8')
      ) as SnapshotInfo
      snapshots.push({ dir, folderName: entry.name, snapshot })
    } catch {
      continue
    }
  }

  return snapshots.sort((a, b) =>
    (a.snapshot.createdAt ?? a.folderName).localeCompare(
      b.snapshot.createdAt ?? b.folderName
    )
  )
}

export const listSaveBackups = (
  appName: string,
  backupRoot: string
): SaveBackupEntry[] => {
  const entries: SaveBackupEntry[] = []

  for (const appDir of findAppBackupFolders(appName, backupRoot)) {
    const appFolder = relative(backupRoot, appDir)
    for (const entry of readdirSync(appDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const locationDir = join(appDir, entry.name)
      const snapshots = readSnapshots(locationDir)
      if (!snapshots.length) continue

      const manifest = readManifest(locationDir)
      const location = snapshots[snapshots.length - 1].snapshot.location
      const currentHash = locationStateHash(location, manifest?.files)

      for (const { folderName, snapshot } of snapshots) {
        entries.push({
          id: [appFolder, entry.name, folderName].join('/'),
          createdAt:
            parseBackupDate(snapshot.createdAt)?.toISOString() ??
            snapshot.createdAt,
          location: snapshot.location,
          changed: snapshot.changed?.length ?? 0,
          deleted: snapshot.deleted?.length ?? 0,
          isCurrent:
            snapshot.stateHash && currentHash
              ? snapshot.stateHash === currentHash
              : undefined
        })
      }
    }
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const restoreSaveBackup = ({
  appName,
  title,
  backupId,
  backupRoot
}: {
  appName: string
  title?: string
  backupId: string
  backupRoot: string
}): (SaveBackupEntry & { alreadyCurrent?: boolean }) | undefined => {
  const [appFolder, locationKey, targetFolder] = backupId.split('/')
  if (!appFolder || !locationKey || !targetFolder) {
    return undefined
  }

  const locationDir = join(backupRoot, appFolder, locationKey)
  const snapshots = readSnapshots(locationDir)
  const targetIndex = snapshots.findIndex(
    ({ folderName }) => folderName === targetFolder
  )
  if (targetIndex < 0) {
    return undefined
  }

  const { dir: targetDir, snapshot: target } = snapshots[targetIndex]
  if (!target.location) {
    return undefined
  }

  const manifest = readManifest(locationDir)
  const currentHash = locationStateHash(target.location, manifest?.files)
  if (target.stateHash && currentHash && target.stateHash === currentHash) {
    return {
      id: backupId,
      createdAt: target.createdAt,
      location: target.location,
      changed: 0,
      deleted: 0,
      alreadyCurrent: true
    }
  }

  backupSaveLocations({
    appName,
    title,
    locations: [target.location],
    backupRoot
  })

  for (const { dir, snapshot } of snapshots.slice(0, targetIndex + 1)) {
    for (const file of [
      ...(snapshot.carried ?? []),
      ...(snapshot.changed ?? [])
    ]) {
      const source = join(dir, 'files', file)
      if (!existsSync(source)) continue
      const destination = join(target.location, file)
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(source, destination)
    }
    for (const file of snapshot.deleted ?? []) {
      rmSync(join(target.location, file), { force: true })
    }
  }

  logInfo(
    ['Restored save backup', targetDir, 'for', appName],
    LogPrefix.Backend
  )

  return {
    id: backupId,
    createdAt: target.createdAt,
    location: target.location,
    changed: target.changed?.length ?? 0,
    deleted: target.deleted?.length ?? 0
  }
}

export const getSaveBackups = (appName: string): SaveBackupEntry[] =>
  listSaveBackups(appName, getBackupRoot())

export const getSaveBackupFolder = (appName: string): string => {
  const backupRoot = getBackupRoot()
  const [folder] = findAppBackupFolders(appName, backupRoot)
  return folder ?? backupRoot
}

export const restoreSaveBackupById = ({
  appName,
  title,
  backupId
}: {
  appName: string
  title?: string
  backupId: string
}): { status: 'done' | 'error'; error?: string; alreadyCurrent?: boolean } => {
  try {
    const restored = restoreSaveBackup({
      appName,
      title,
      backupId,
      backupRoot: getBackupRoot()
    })
    if (!restored) {
      return { status: 'error', error: 'Backup not found' }
    }
    if (restored.alreadyCurrent) {
      return { status: 'done', alreadyCurrent: true }
    }
    return { status: 'done' }
  } catch (error) {
    return { status: 'error', error: `${error}` }
  }
}
