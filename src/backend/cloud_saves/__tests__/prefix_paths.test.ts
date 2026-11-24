import { mkdirSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { findPrefixUserDir, resolveWindowsPathInPrefix } from '../prefix_paths'

const directories: string[] = []

const makePrefix = () => {
  const prefix = mkdtempSync(join(tmpdir(), 'heroic-prefix-'))
  directories.push(prefix)
  return prefix
}

const makeUserDir = (prefix: string, user = 'steamuser') =>
  join(prefix, 'pfx', 'drive_c', 'users', user)

afterAll(() => {
  for (const directory of directories) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('prefix_paths', () => {
  test('resolves windows environment variables inside the prefix', () => {
    const prefix = makePrefix()
    const userDir = makeUserDir(prefix)
    mkdirSync(join(userDir, 'AppData', 'Local'), { recursive: true })
    mkdirSync(join(userDir, 'Documents'), { recursive: true })

    expect(
      resolveWindowsPathInPrefix(
        '%USERPROFILE%\\Documents/My Games/SpecOps-TheLine/SRGame/SaveData',
        prefix
      )
    ).toBe(
      join(
        userDir,
        'Documents',
        'My Games',
        'SpecOps-TheLine',
        'SRGame',
        'SaveData'
      )
    )

    expect(
      resolveWindowsPathInPrefix('%LocalAppData%\\GOG.com\\Galaxy', prefix)
    ).toBe(join(userDir, 'AppData', 'Local', 'GOG.com', 'Galaxy'))
  })

  test('normalizes relative segments', () => {
    const prefix = makePrefix()
    const userDir = makeUserDir(prefix)
    mkdirSync(userDir, { recursive: true })

    expect(
      resolveWindowsPathInPrefix('%APPDATA%\\..\\LocalLow\\Game', prefix)
    ).toBe(join(userDir, 'AppData', 'LocalLow', 'Game'))
  })

  test('supports prefixes without the pfx folder', () => {
    const prefix = makePrefix()
    const userDir = join(prefix, 'drive_c', 'users', 'flavio')
    mkdirSync(userDir, { recursive: true })

    expect(findPrefixUserDir(prefix)).toBe(userDir)
  })

  test('returns undefined when the prefix has no user dir or unknown variables', () => {
    const prefix = makePrefix()
    expect(findPrefixUserDir(prefix)).toBeUndefined()
    expect(
      resolveWindowsPathInPrefix('%USERPROFILE%\\x', prefix)
    ).toBeUndefined()

    mkdirSync(makeUserDir(prefix), { recursive: true })
    expect(resolveWindowsPathInPrefix('%UNKNOWN%\\x', prefix)).toBeUndefined()
  })
})
