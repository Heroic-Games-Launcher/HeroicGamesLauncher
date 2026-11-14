import { mkdtempSync, rmSync, writeFileSync } from 'graceful-fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  chainWineCommands,
  getWinePrefixRoot,
  isRegistryStringSet,
  parseWinePathOutput
} from '../wine_prefix'
import { WineInstallation } from 'common/types'

jest.mock('../../logger')

const wineOfType = (type: WineInstallation['type']): WineInstallation => ({
  bin: '/wine/bin',
  name: 'Some Wine',
  type
})

describe('getWinePrefixRoot', () => {
  test('uses the pfx subfolder for Proton', () => {
    expect(
      getWinePrefixRoot({
        winePrefix: '/prefixes/Game',
        wineVersion: wineOfType('proton')
      })
    ).toBe('/prefixes/Game/pfx')
  })

  test.each(['wine', 'toolkit'] as const)(
    'uses the prefix itself for %s',
    (type) => {
      expect(
        getWinePrefixRoot({
          winePrefix: '/prefixes/Game',
          wineVersion: wineOfType(type)
        })
      ).toBe('/prefixes/Game')
    }
  )

  test('returns null for CrossOver bottles', () => {
    expect(
      getWinePrefixRoot({
        winePrefix: '/prefixes/Game',
        wineVersion: wineOfType('crossover')
      })
    ).toBeNull()
  })
})

describe('isRegistryStringSet', () => {
  const key = 'Software\\Wow6432Node\\GOG.com\\GalaxyClient\\paths'
  const data = 'C:\\Program Files\\GOG Galaxy'
  let dir: string
  let regFile: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'heroic-reg-'))
    regFile = join(dir, 'system.reg')
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  // Copied from a system.reg written by GE-Proton after
  // `reg add HKLM\SOFTWARE\WOW6432Node\GOG.com\GalaxyClient\paths ...`
  const writtenByWine = [
    'WINE REGISTRY Version 2',
    ';; All keys relative to \\\\Machine',
    '',
    '[Software\\\\Wow6432Node\\\\GOG.com\\\\GalaxyClient] 1791821083',
    '#time=1dd5a6364f20ef8',
    '',
    '[Software\\\\Wow6432Node\\\\GOG.com\\\\GalaxyClient\\\\paths] 1791821083',
    '#time=1dd5a6364f20ef8',
    '"client"="C:\\\\Program Files\\\\GOG Galaxy"',
    ''
  ].join('\n')

  test('finds a value written by Wine, ignoring key case', async () => {
    writeFileSync(regFile, writtenByWine)
    await expect(
      isRegistryStringSet(
        regFile,
        'SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths',
        'client',
        data
      )
    ).resolves.toBe(true)
  })

  test('ignores value name case', async () => {
    writeFileSync(regFile, writtenByWine)
    await expect(
      isRegistryStringSet(regFile, key, 'CLIENT', data)
    ).resolves.toBe(true)
  })

  test('is false when the data differs', async () => {
    writeFileSync(regFile, writtenByWine)
    await expect(
      isRegistryStringSet(regFile, key, 'client', 'D:\\Galaxy')
    ).resolves.toBe(false)
  })

  test('is false when the value is only set in another key', async () => {
    writeFileSync(
      regFile,
      [
        '[Software\\\\Wow6432Node\\\\GOG.com\\\\GalaxyClient\\\\paths] 1',
        '"other"="1"',
        '',
        '[Software\\\\Wow6432Node\\\\GOG.com\\\\GalaxyClient\\\\paths2] 1',
        '"client"="C:\\\\Program Files\\\\GOG Galaxy"',
        ''
      ].join('\n')
    )
    await expect(
      isRegistryStringSet(regFile, key, 'client', data)
    ).resolves.toBe(false)
  })

  test('is false when the key is missing', async () => {
    writeFileSync(regFile, 'WINE REGISTRY Version 2\n')
    await expect(
      isRegistryStringSet(regFile, key, 'client', data)
    ).resolves.toBe(false)
  })

  test('is false when the registry file does not exist', async () => {
    await expect(
      isRegistryStringSet(join(dir, 'missing.reg'), key, 'client', data)
    ).resolves.toBe(false)
  })
})

describe('chainWineCommands', () => {
  test('leaves a single command untouched', () => {
    expect(chainWineCommands([['reg', 'add', 'HKLM\\Key']])).toEqual([
      'reg',
      'add',
      'HKLM\\Key'
    ])
  })

  test('joins several commands with & under one cmd /c', () => {
    expect(
      chainWineCommands([
        ['sc', 'create', 'Service'],
        ['reg', 'add', 'HKLM\\Key', '/d', 'C:\\Program Files\\App']
      ])
    ).toEqual([
      'cmd',
      '/c',
      'sc',
      'create',
      'Service',
      '&',
      'reg',
      'add',
      'HKLM\\Key',
      '/d',
      'C:\\Program Files\\App'
    ])
  })
})

describe('parseWinePathOutput', () => {
  test('returns one result per line, in order', () => {
    expect(
      parseWinePathOutput('X:\\Games\\Some Game\r\nX:\\.config\\support\r\n', 2)
    ).toEqual(['X:\\Games\\Some Game', 'X:\\.config\\support'])
  })

  test('handles a single path', () => {
    expect(parseWinePathOutput('/home/user/Games\n', 1)).toEqual([
      '/home/user/Games'
    ])
  })

  test('returns null when a path produced no output', () => {
    expect(parseWinePathOutput('X:\\Games\n', 2)).toBeNull()
    expect(parseWinePathOutput('', 1)).toBeNull()
  })
})
