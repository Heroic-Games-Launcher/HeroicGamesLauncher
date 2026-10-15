import {
  getDefaultWine,
  getRequiredPrefixFiles,
  getWineExecs,
  getWineLibs,
  isProtonPrefixUpToDate
} from '../compatibility_layers'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import child_process from 'child_process'

jest.mock('../../logger')

describe('getDefaultWine', () => {
  test('return wine not found', () => {
    const expected = {
      bin: '',
      name: 'Default Wine - Not Found',
      type: 'wine'
    }
    jest.spyOn(child_process, 'execSync').mockImplementation(() => {
      throw new Error()
    })
    const result = getDefaultWine()
    expect(result).toEqual(expected)
  })

  test('return list with one default wine', () => {
    // spy on the execSync calling which wine and returning /usr/bin/wine
    jest.spyOn(child_process, 'execSync').mockImplementation((command) => {
      if (command === 'which wine') {
        return '/usr/bin/wine\n'
      } else if (command === 'wine --version') {
        return 'wine-6.0 (Staging)\n'
      }
      throw new Error('Unexpected command')
    })

    const result = getDefaultWine()
    expect(result.bin).toBe('/usr/bin/wine')
    expect(result.name).toBe('wine-6.0 (Staging)')
    expect(result.type).toBe('wine')
  })
})

describe('getWineLibs', () => {
  it('should return empty strings if lib and lib32 do not exist', () => {
    const wineBin = '/path/to/wine'
    const { lib, lib32 } = getWineLibs(wineBin)
    expect(lib).toBe('')
    expect(lib32).toBe('')
  })

  it('should return the path to lib32 if it exists', () => {
    const wineBin = join(tmpdir(), 'wine_test')
    const wineDir = join(wineBin, '..')
    const lib32Path = join(wineDir, '../lib')
    mkdirSync(lib32Path, { recursive: true })
    const { lib32 } = getWineLibs(wineBin)
    expect(lib32).toBe(lib32Path)
  })

  it('should return the path to lib if it exists', () => {
    const wineBin = join(tmpdir(), 'wine_test')
    const wineDir = join(wineBin, '..')
    const libPath = join(wineDir, '../lib64')
    mkdirSync(libPath, { recursive: true })
    const { lib } = getWineLibs(wineBin)
    expect(lib).toBe(libPath)
  })

  it('should return the paths to lib and lib32 if they both exist', () => {
    const wineBin = join(tmpdir(), 'wine_test')
    const wineDir = join(wineBin, '..')
    const libPath = join(wineDir, '../lib64')
    const lib32Path = join(wineDir, '../lib')
    mkdirSync(libPath, { recursive: true })
    mkdirSync(lib32Path, { recursive: true })
    const { lib, lib32 } = getWineLibs(wineBin)
    expect(lib).toBe(libPath)
    expect(lib32).toBe(lib32Path)
  })
})

describe('getWineExes', () => {
  describe('getWineExecs', () => {
    it('should return the path to wineserver if it exists', () => {
      const wineBin = join(tmpdir(), 'wine_test')
      const wineDir = dirname(wineBin)
      const wineServerPath = join(wineDir, 'wineserver')
      mkdirSync(wineServerPath, { recursive: true })
      const execs = getWineExecs(wineBin)
      expect(execs.wineserver).toBe(wineServerPath)
    })

    it('should return an empty string if wineserver does not exist', () => {
      const wineBin = '/path/to/wine'
      const execs = getWineExecs(wineBin)
      expect(execs.wineserver).toBe('')
    })
  })
})

describe('getRequiredPrefixFiles', () => {
  it('should list the Wine prefix files', () => {
    const files = ['dosdevices', 'drive_c', 'system.reg', 'user.reg']
    expect(getRequiredPrefixFiles('pfx', 'wine')).toEqual([
      ...[...files, 'userdef.reg'].map((file) => join('pfx', file)),
      'pfx'
    ])
  })

  it('should list the Proton compat data files', () => {
    const pfxFiles = ['dosdevices', 'drive_c', 'system.reg', 'user.reg']
    expect(getRequiredPrefixFiles('data', 'proton')).toEqual([
      ...['pfx.lock', 'tracked_files', 'version', 'config_info'].map((file) =>
        join('data', file)
      ),
      ...[...pfxFiles, 'userdef.reg'].map((file) => join('data', 'pfx', file)),
      'data'
    ])
  })
})

describe('isProtonPrefixUpToDate', () => {
  let root: string
  let prefix: string
  let protonBin: string

  const createPrefix = (version: string) => {
    for (const path of getRequiredPrefixFiles(prefix, 'proton')) {
      mkdirSync(dirname(path), { recursive: true })
      if (path !== prefix) writeFileSync(path, '')
    }
    writeFileSync(join(prefix, 'version'), `${version}\n`)
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-prefix-test-'))
    prefix = join(root, 'prefix')
    protonBin = join(root, 'proton')
    writeFileSync(
      protonBin,
      '#!/usr/bin/env python3\n\nCURRENT_PREFIX_VERSION="GE-Proton10-1"\n'
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('should return true if the prefix matches the Proton version', async () => {
    createPrefix('GE-Proton10-1')
    expect(await isProtonPrefixUpToDate(prefix, protonBin)).toBe(true)
  })

  it('should return false if the prefix was set up by another version', async () => {
    createPrefix('GE-Proton9-27')
    expect(await isProtonPrefixUpToDate(prefix, protonBin)).toBe(false)
  })

  it('should return false if the prefix does not exist', async () => {
    expect(await isProtonPrefixUpToDate(prefix, protonBin)).toBe(false)
  })

  it('should return false if a required file is missing', async () => {
    createPrefix('GE-Proton10-1')
    rmSync(join(prefix, 'pfx', 'user.reg'))
    expect(await isProtonPrefixUpToDate(prefix, protonBin)).toBe(false)
  })

  it('should return false if the Proton script has no prefix version', async () => {
    createPrefix('GE-Proton10-1')
    writeFileSync(protonBin, '#!/usr/bin/env python3\n')
    expect(await isProtonPrefixUpToDate(prefix, protonBin)).toBe(false)
  })

  it('should return false if the Proton script is missing', async () => {
    createPrefix('GE-Proton10-1')
    rmSync(protonBin)
    expect(await isProtonPrefixUpToDate(prefix, protonBin)).toBe(false)
  })
})
