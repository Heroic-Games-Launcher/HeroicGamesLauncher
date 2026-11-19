import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { copyMissingSaveFiles } from '../migrate'
import {
  getSavePathMigrations,
  shouldPreserveSavePaths
} from '../save_path_migrations'

const directories: string[] = []

const makeDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'heroic-migrate-'))
  directories.push(dir)
  return dir
}

afterAll(() => {
  for (const dir of directories) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('copyMissingSaveFiles', () => {
  test('copies files and folders that do not exist in the destination', () => {
    const from = makeDir()
    const to = makeDir()
    mkdirSync(join(from, 'sub'))
    writeFileSync(join(from, 'a.sav'), 'a')
    writeFileSync(join(from, 'sub', 'b.sav'), 'b')

    expect(copyMissingSaveFiles(from, to)).toBe(2)
    expect(readFileSync(join(to, 'a.sav'), 'utf-8')).toBe('a')
    expect(readFileSync(join(to, 'sub', 'b.sav'), 'utf-8')).toBe('b')
  })

  test('does not overwrite files that already exist', () => {
    const from = makeDir()
    const to = makeDir()
    writeFileSync(join(from, 'a.sav'), 'old')
    writeFileSync(join(to, 'a.sav'), 'new')

    expect(copyMissingSaveFiles(from, to)).toBe(0)
    expect(readFileSync(join(to, 'a.sav'), 'utf-8')).toBe('new')
  })

  test('does nothing when the source does not exist', () => {
    const from = makeDir()
    const to = makeDir()
    expect(copyMissingSaveFiles(from, to)).toBe(0)
    expect(copyMissingSaveFiles(join(from, 'missing'), to)).toBe(0)
  })

  test('does nothing when the destination is a parent of the source', () => {
    const root = makeDir()
    const from = mkdtempSync(join(root, 'child-'))
    writeFileSync(join(from, 'a.sav'), 'a')

    expect(copyMissingSaveFiles(from, root)).toBe(0)
  })

  test('does nothing when both paths are the same', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'a.sav'), 'a')
    expect(copyMissingSaveFiles(dir, dir)).toBe(0)
  })
})

describe('getSavePathMigrations', () => {
  const gogSettings = {
    gogSaves: [
      { name: 'main', location: '/old/main' },
      { name: 'shared', location: '/old/shared' }
    ]
  } as never

  test('pairs GOG locations by name and skips unchanged paths', () => {
    expect(
      getSavePathMigrations('gog', gogSettings, [
        { name: 'main', location: '/new/main' },
        { name: 'shared', location: '/old/shared' }
      ])
    ).toEqual([['/old/main', '/new/main']])
  })

  test('migrates a changed legendary path', () => {
    const settings = { savesPath: '/old/saves' } as never
    expect(getSavePathMigrations('legendary', settings, '/new/saves')).toEqual([
      ['/old/saves', '/new/saves']
    ])
    expect(getSavePathMigrations('legendary', settings, '/old/saves')).toEqual(
      []
    )
  })

  test('does nothing when there is no previous configuration', () => {
    expect(getSavePathMigrations('legendary', {} as never, '/new')).toEqual([])
    expect(getSavePathMigrations('gog', {} as never, [])).toEqual([])
  })
})

describe('shouldPreserveSavePaths', () => {
  test('preserves a custom configuration after it becomes stale', () => {
    expect(
      shouldPreserveSavePaths(
        { savePathIsCustom: true, savesPathFingerprint: 'old' },
        'new'
      )
    ).toBe(true)
  })

  test('does not preserve automatically detected or current paths', () => {
    expect(
      shouldPreserveSavePaths(
        { savePathIsCustom: false, savesPathFingerprint: 'old' },
        'new'
      )
    ).toBe(false)
    expect(
      shouldPreserveSavePaths(
        { savePathIsCustom: true, savesPathFingerprint: 'current' },
        'current'
      )
    ).toBe(false)
  })
})
