import { mkdirSync, writeFileSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import child_process from 'child_process'

// Mock modules BEFORE importing the module under test
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  LogPrefix: {
    GlobalConfig: 'GlobalConfig'
  }
}))

// Mock utils with explicit implementation
jest.mock('backend/utils', () => ({
  getSteamLibraries: () => Promise.resolve([]),
  execAsync: () => Promise.resolve()
}))

// Mock GlobalConfig with the settings needed for tests
jest.mock('backend/config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => ({
        showValveProton: false,
        customWinePaths: []
      })
    })
  }
}))

import {
  getDefaultWine,
  getWineExecs,
  getWineLibs,
  getLinuxWineSet
} from '../compatibility_layers'
jest.mock('backend/constants/paths', () => {
  const pathModule = jest.requireActual<typeof import('path')>('path')
  const osModule = jest.requireActual<typeof import('os')>('os')
  const testToolsPath = pathModule.join(osModule.tmpdir(), 'heroic-test-tools')
  return {
    ...jest.requireActual('backend/constants/paths'),
    toolsPath: testToolsPath,
    configPath: pathModule.join(testToolsPath, 'config.json'),
    userHome: osModule.tmpdir(),
    appFolder: testToolsPath,
    publicDir: pathModule.join(__dirname, '..', '..', '..', 'public'),
    fixAsarPath: (path: string) => path
  }
})

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

describe('getLinuxWineSet - Proton detection', () => {
  const testToolsPath = join(tmpdir(), 'heroic-test-tools')
  const protonPath = join(testToolsPath, 'proton')

  beforeEach(() => {
    // Clean up and create fresh test directories
    mkdirSync(join(testToolsPath, 'wine'), { recursive: true })
    mkdirSync(protonPath, { recursive: true })
  })

  describe('VDF-based detection', () => {
    it('should detect proton from VDF file with relative install_path', async () => {
      const protonDir = join(protonPath, 'GE-Proton8-1')
      const protonBin = join(protonDir, 'proton')
      mkdirSync(protonDir, { recursive: true })
      writeFileSync(protonBin, '#!/bin/bash\necho "proton"')

      // Create VDF file in the proton directory
      const vdfContent = `"compatibilitytools"
{
  "compat_tools"
  {
    "GE-Proton8-1"
    {
      "display_name" "GE-Proton 8.1"
      "install_path" "."
    }
  }
}`
      writeFileSync(join(protonDir, 'compatibilitytool.vdf'), vdfContent)

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const geProton = protonInstalls.find((p) => p.name === 'GE-Proton 8.1')
      expect(geProton).toBeDefined()
      expect(geProton?.bin).toBe(protonBin)
    })

    it('should detect proton from VDF file with absolute install_path', async () => {
      const protonDir = join(protonPath, 'custom-proton')
      const actualProtonDir = join(tmpdir(), 'custom-install-location')
      const protonBin = join(actualProtonDir, 'proton')
      mkdirSync(protonDir, { recursive: true })
      mkdirSync(actualProtonDir, { recursive: true })
      writeFileSync(protonBin, '#!/bin/bash\necho "proton"')

      const vdfContent = `"compatibilitytools"
{
  "compat_tools"
  {
    "custom-proton"
    {
      "display_name" "Custom Proton"
      "install_path" "${actualProtonDir.replace(/\\/g, '/')}"
    }
  }
}`
      writeFileSync(join(protonDir, 'compatibilitytool.vdf'), vdfContent)

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const customProton = protonInstalls.find(
        (p) => p.name === 'Custom Proton'
      )
      expect(customProton).toBeDefined()
      expect(customProton?.bin).toBe(protonBin)
    })

    it('should skip VDF files without proton binary', async () => {
      const protonDir = join(protonPath, 'MissingBinary')
      mkdirSync(protonDir, { recursive: true })

      const vdfContent = `"compatibilitytools"
{
  "compat_tools"
  {
    "MissingBinary"
    {
      "display_name" "Missing Binary"
      "install_path" "."
    }
  }
}`
      writeFileSync(join(protonDir, 'compatibilitytool.vdf'), vdfContent)

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const missingProton = protonInstalls.find(
        (p) => p.name === 'Missing Binary'
      )
      expect(missingProton).toBeUndefined()
    })

    it('should skip UMU-Latest directories', async () => {
      const umuDir = join(protonPath, 'UMU-Latest-1234')
      const protonBin = join(umuDir, 'proton')
      mkdirSync(umuDir, { recursive: true })
      writeFileSync(protonBin, '#!/bin/bash\necho "proton"')

      const vdfContent = `"compatibilitytools"
{
  "compat_tools"
  {
    "UMU-Latest"
    {
      "display_name" "UMU Latest"
      "install_path" "."
    }
  }
}`
      writeFileSync(join(umuDir, 'compatibilitytool.vdf'), vdfContent)

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const umuProton = protonInstalls.find((p) => p.name.includes('UMU'))
      expect(umuProton).toBeUndefined()
    })
  })

  describe('Non-VDF fallback detection', () => {
    it('should detect proton from directory structure without VDF', async () => {
      const protonDir = join(protonPath, 'OldProton-5.0')
      const protonBin = join(protonDir, 'proton')
      mkdirSync(protonDir, { recursive: true })
      writeFileSync(protonBin, '#!/bin/bash\necho "proton"')

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const oldProton = protonInstalls.find((p) => p.name === 'OldProton-5.0')
      expect(oldProton).toBeDefined()
      expect(oldProton?.bin).toBe(protonBin)
    })

    it('should not duplicate entries when both VDF and binary exist', async () => {
      const protonDir = join(protonPath, 'DualProton')
      const protonBin = join(protonDir, 'proton')
      mkdirSync(protonDir, { recursive: true })
      writeFileSync(protonBin, '#!/bin/bash\necho "proton"')

      // Create VDF
      const vdfContent = `"compatibilitytools"
{
  "compat_tools"
  {
    "DualProton"
    {
      "display_name" "Dual Proton"
      "install_path" "."
    }
  }
}`
      writeFileSync(join(protonDir, 'compatibilitytool.vdf'), vdfContent)

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const dualProtonMatches = protonInstalls.filter(
        (p) => p.name === 'Dual Proton' || p.name === 'DualProton'
      )
      expect(dualProtonMatches.length).toBe(1)
    })

    it('should skip UMU-Latest directories in fallback detection', async () => {
      const umuDir = join(protonPath, 'UMU-Latest-5678')
      const protonBin = join(umuDir, 'proton')
      mkdirSync(umuDir, { recursive: true })
      writeFileSync(protonBin, '#!/bin/bash\necho "proton"')

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const umuProton = protonInstalls.find((p) =>
        p.name.startsWith('UMU-Latest')
      )
      expect(umuProton).toBeUndefined()
    })

    it('should detect multiple proton versions without VDF', async () => {
      const proton1Dir = join(protonPath, 'Proton-4.11')
      const proton2Dir = join(protonPath, 'Proton-5.0')

      mkdirSync(proton1Dir, { recursive: true })
      mkdirSync(proton2Dir, { recursive: true })

      writeFileSync(join(proton1Dir, 'proton'), '#!/bin/bash\necho "proton"')
      writeFileSync(join(proton2Dir, 'proton'), '#!/bin/bash\necho "proton"')

      const result = await getLinuxWineSet()
      const protonInstalls = Array.from(result).filter(
        (w) => w.type === 'proton'
      )

      const proton411 = protonInstalls.find((p) => p.name === 'Proton-4.11')
      const proton50 = protonInstalls.find((p) => p.name === 'Proton-5.0')

      expect(proton411).toBeDefined()
      expect(proton50).toBeDefined()
    })
  })
})
