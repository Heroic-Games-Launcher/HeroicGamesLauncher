import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpRoot = mkdtempSync(join(tmpdir(), 'heroic-discover-test-'))

jest.mock('electron', () => ({
  app: {
    getPath: () => tmpRoot,
    isPackaged: false
  }
}))
jest.mock('backend/logger', () => ({
  logWarning: jest.fn(),
  LogPrefix: { ImportExport: 'ImportExport' }
}))

import { discoverHeroicBackups } from '../discover'

function touch(path: string, contents: string, timestamp: number): void {
  writeFileSync(path, contents)
  utimesSync(path, timestamp / 1000, timestamp / 1000)
}

describe('discoverHeroicBackups', () => {
  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('lists Heroic backups newest first and ignores other files', () => {
    const dir = join(tmpRoot, 'home')
    mkdirSync(dir, { recursive: true })

    const older = join(dir, 'heroic-backup-2026-01-01_10-00-00.zip')
    const newer = join(dir, 'heroic-backup-2026-02-01_10-00-00.zip')
    touch(older, 'older', Date.now() - 60_000)
    touch(newer, 'newer', Date.now())
    writeFileSync(join(dir, 'notes.zip'), 'not a backup')
    writeFileSync(join(dir, 'heroic-backup-2026-03-01.txt'), 'not a zip')
    mkdirSync(join(dir, 'heroic-backup-folder.zip'))

    const result = discoverHeroicBackups(dir)

    expect(result.directory).toBe(dir)
    expect(result.backups.map((b) => b.fileName)).toEqual([
      'heroic-backup-2026-02-01_10-00-00.zip',
      'heroic-backup-2026-01-01_10-00-00.zip'
    ])
    expect(result.backups[0]).toMatchObject({
      path: newer,
      size: 'newer'.length
    })
    expect(result.backups[1]).toMatchObject({
      path: older,
      size: 'older'.length
    })
  })

  it('returns an empty list when the folder does not exist', () => {
    const dir = join(tmpRoot, 'missing')
    expect(discoverHeroicBackups(dir)).toEqual({
      directory: dir,
      backups: []
    })
  })
})
