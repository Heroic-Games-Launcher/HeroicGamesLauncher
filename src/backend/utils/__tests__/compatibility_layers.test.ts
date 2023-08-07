import { describe } from 'node:test'
import {
  getDefaultWine,
  getWineExecs,
  getWineLibs
} from '../compatibility_layers'
import { mkdirSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'

jest.mock('../../logger/logfile')

describe('getDefaultWine', () => {
  test('return wine not found', () => {
    const expected = {
      bin: '',
      name: 'Default Wine - Not Found',
      type: 'wine'
    }
    const result = getDefaultWine()
    expect(result).toEqual(expected)
  })

  test('return list with one default wine', () => {
    const expected = {
      bin: '/usr/bin/wine',
      name: 'Wine Default - wine-6.0 (Staging)',
      type: 'wine',
      wineserver: ''
    }

    // spy on the execSync calling which wine and returning /usr/bin/wine
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const execSync = jest.spyOn(require('child_process'), 'execSync')
    execSync.mockImplementation((command: any) => {
      if (command === 'which wine') {
        return '/usr/bin/wine\n'
      } else if (command === 'wine --version') {
        return 'wine-6.0 (Staging)\n'
      }
      throw new Error('Unexpected command')
    })

    const result = getDefaultWine()
    expect(result).toEqual(expected)
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
