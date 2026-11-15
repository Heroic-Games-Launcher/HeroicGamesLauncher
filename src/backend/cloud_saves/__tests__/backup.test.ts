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
  getChangedFiles
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
