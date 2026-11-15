import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  backupSaveLocations,
  getBackupFolderName,
  getChangedFiles,
  listSaveBackups,
  restoreSaveBackup
} from '../backup'

jest.mock('../../config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => ({ backupSaves: true, defaultInstallPath: '/tmp' })
    })
  }
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))

const directories: string[] = []

const makeDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'heroic-saves-'))
  directories.push(dir)
  return dir
}

const snapshots = (backupRoot: string, folderName: string) => {
  const locationKey = readdirSync(join(backupRoot, folderName), {
    withFileTypes: true
  }).find((entry) => entry.isDirectory())?.name as string
  const locationDir = join(backupRoot, folderName, locationKey)
  return {
    locationDir,
    dirs: readdirSync(locationDir)
      .filter((entry) => entry !== 'manifest.json')
      .sort()
  }
}

afterAll(() => {
  for (const dir of directories) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('getChangedFiles', () => {
  test('returns everything on the first backup', () => {
    expect(
      getChangedFiles(undefined, {
        'a.sav': { size: 1, mtimeMs: 1 }
      })
    ).toEqual(['a.sav'])
  })

  test('returns only new or modified files', () => {
    const previous = {
      'a.sav': { size: 1, mtimeMs: 1 },
      'b.sav': { size: 1, mtimeMs: 1 }
    }
    expect(
      getChangedFiles(previous, {
        'a.sav': { size: 1, mtimeMs: 1 },
        'b.sav': { size: 2, mtimeMs: 2 },
        'c.sav': { size: 1, mtimeMs: 1 }
      })
    ).toEqual(['b.sav', 'c.sav'])
  })
})

describe('backupSaveLocations', () => {
  test('stores only what changed between backups', () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    mkdirSync(join(saveDir, 'sub'))
    writeFileSync(join(saveDir, 'a.sav'), 'first save')
    writeFileSync(join(saveDir, 'sub', 'b.sav'), 'nested save')

    backupSaveLocations({ appName: 'Game', locations: [saveDir], backupRoot })

    const first = snapshots(backupRoot, 'Game')
    expect(first.dirs).toHaveLength(1)
    expect(
      existsSync(join(first.locationDir, first.dirs[0], 'files', 'a.sav'))
    ).toBe(true)
    expect(
      existsSync(
        join(first.locationDir, first.dirs[0], 'files', 'sub', 'b.sav')
      )
    ).toBe(true)

    writeFileSync(join(saveDir, 'a.sav'), 'second save with more data')
    backupSaveLocations({ appName: 'Game', locations: [saveDir], backupRoot })

    const second = snapshots(backupRoot, 'Game')
    expect(second.dirs).toHaveLength(2)
    const latest = second.dirs[1]
    expect(existsSync(join(second.locationDir, latest, 'files', 'a.sav'))).toBe(
      true
    )
    expect(
      existsSync(join(second.locationDir, latest, 'files', 'sub', 'b.sav'))
    ).toBe(false)
    expect(
      JSON.parse(
        readFileSync(join(second.locationDir, latest, 'snapshot.json'), 'utf-8')
      ).changed
    ).toEqual(['a.sav'])
  })

  test('records deletions and skips unchanged saves', () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveDir, 'a.sav'), 'a')
    writeFileSync(join(saveDir, 'b.sav'), 'b')

    backupSaveLocations({ appName: 'Game', locations: [saveDir], backupRoot })
    backupSaveLocations({ appName: 'Game', locations: [saveDir], backupRoot })
    expect(snapshots(backupRoot, 'Game').dirs).toHaveLength(1)

    rmSync(join(saveDir, 'b.sav'))
    backupSaveLocations({ appName: 'Game', locations: [saveDir], backupRoot })

    const backup = snapshots(backupRoot, 'Game')
    expect(backup.dirs).toHaveLength(2)
    const latest = backup.dirs[1]
    const snapshot = JSON.parse(
      readFileSync(join(backup.locationDir, latest, 'snapshot.json'), 'utf-8')
    )
    expect(snapshot.deleted).toEqual(['b.sav'])
    expect(snapshot.changed).toEqual([])
  })
})

describe('getBackupFolderName', () => {
  test('sanitizes characters that are invalid in folder names', () => {
    expect(getBackupFolderName('DOOM 3: BFG Edition', 'app')).toBe(
      'DOOM 3_ BFG Edition'
    )
    expect(getBackupFolderName('A/B\\C', 'app')).toBe('A_B_C')
  })

  test('falls back to the app name when the title is unusable', () => {
    expect(getBackupFolderName(undefined, 'app')).toBe('app')
    expect(getBackupFolderName('  ..  ', 'app')).toBe('app')
  })
})

describe('backupSaveLocations with game titles', () => {
  test('stores backups under the game title', () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveDir, 'a.sav'), 'a')

    backupSaveLocations({
      appName: 'abc123',
      title: 'My Game: Deluxe',
      locations: [saveDir],
      backupRoot
    })

    const folder = getBackupFolderName('My Game: Deluxe', 'abc123')
    expect(folder).toBe('My Game_ Deluxe')
    expect(snapshots(backupRoot, folder).dirs).toHaveLength(1)
  })

  test('avoids colliding when two games share the same title', () => {
    const saveA = makeDir()
    const saveB = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveA, 'a.sav'), 'a')
    writeFileSync(join(saveB, 'b.sav'), 'b')

    backupSaveLocations({
      appName: 'appA',
      title: 'Shared',
      locations: [saveA],
      backupRoot
    })
    backupSaveLocations({
      appName: 'appB',
      title: 'Shared',
      locations: [saveB],
      backupRoot
    })

    expect(existsSync(join(backupRoot, 'Shared'))).toBe(true)
    expect(existsSync(join(backupRoot, 'Shared (appB)'))).toBe(true)
  })
})

describe('listSaveBackups and restoreSaveBackup', () => {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 5))

  test('lists backups newest first and restores an older snapshot', async () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveDir, 'a.sav'), 'first')
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot
    })

    await pause()
    writeFileSync(join(saveDir, 'a.sav'), 'second')
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot
    })

    const backups = listSaveBackups('Game', backupRoot)
    expect(backups).toHaveLength(2)
    expect(backups[0].createdAt > backups[1].createdAt).toBe(true)

    const restored = restoreSaveBackup({
      appName: 'Game',
      title: 'Title',
      backupId: backups[1].id,
      backupRoot
    })
    expect(restored).toBeTruthy()
    expect(readFileSync(join(saveDir, 'a.sav'), 'utf-8')).toBe('first')
  })

  test('restores files that were deleted from the save folder', async () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveDir, 'a.sav'), 'a')
    writeFileSync(join(saveDir, 'b.sav'), 'b')
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot
    })

    await pause()
    rmSync(join(saveDir, 'b.sav'))
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot
    })

    const backups = listSaveBackups('Game', backupRoot)
    const withDeletion = backups.find((backup) => backup.deleted > 0)
    expect(withDeletion).toBeTruthy()
    expect(backups[0].deleted).toBe(1)

    restoreSaveBackup({
      appName: 'Game',
      title: 'Title',
      backupId: backups[1].id,
      backupRoot
    })
    expect(readFileSync(join(saveDir, 'b.sav'), 'utf-8')).toBe('b')
  })
})

describe('backup retention', () => {
  test('removes superseded versions to stay within the size limit', () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveDir, 'a.sav'), 'a'.repeat(400))
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot,
      maxBytes: 600
    })

    writeFileSync(join(saveDir, 'a.sav'), 'b'.repeat(400))
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot,
      maxBytes: 600
    })

    const backups = listSaveBackups('Game', backupRoot)
    expect(backups).toHaveLength(1)

    restoreSaveBackup({
      appName: 'Game',
      title: 'Title',
      backupId: backups[0].id,
      backupRoot
    })
    expect(readFileSync(join(saveDir, 'a.sav'), 'utf-8')).toBe('b'.repeat(400))
  })

  test('carries unchanged files into the next snapshot when pruning', () => {
    const saveDir = makeDir()
    const backupRoot = makeDir()
    writeFileSync(join(saveDir, 'big.sav'), 'b'.repeat(600))
    writeFileSync(join(saveDir, 'small.sav'), 's'.repeat(10))
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot
    })

    writeFileSync(join(saveDir, 'big.sav'), 'B'.repeat(600))
    writeFileSync(join(saveDir, 'c.sav'), 'c'.repeat(10))
    backupSaveLocations({
      appName: 'Game',
      title: 'Title',
      locations: [saveDir],
      backupRoot,
      maxBytes: 700
    })

    const backups = listSaveBackups('Game', backupRoot)
    expect(backups).toHaveLength(1)

    rmSync(join(saveDir, 'big.sav'))
    rmSync(join(saveDir, 'small.sav'))
    rmSync(join(saveDir, 'c.sav'))
    restoreSaveBackup({
      appName: 'Game',
      title: 'Title',
      backupId: backups[0].id,
      backupRoot
    })
    expect(readFileSync(join(saveDir, 'big.sav'), 'utf-8')).toBe(
      'B'.repeat(600)
    )
    expect(readFileSync(join(saveDir, 'c.sav'), 'utf-8')).toBe('c'.repeat(10))
    expect(readFileSync(join(saveDir, 'small.sav'), 'utf-8')).toBe(
      's'.repeat(10)
    )
  })
})
