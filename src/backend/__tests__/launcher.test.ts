import { readWinebusHidrawState } from '../launcher'
import { GameSettings } from 'common/types'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('launcher.ts - readWinebusHidrawState', () => {
  const testDir = join(tmpdir(), 'heroic-test-winebus')

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  const createMockSystemReg = (content: string, prefixPath: string) => {
    const systemRegPath = join(prefixPath, 'system.reg')
    writeFileSync(systemRegPath, content)
    return systemRegPath
  }

  test('returns notSet when system.reg does not exist', () => {
    const gameSettings = {
      winePrefix: join(testDir, 'nonexistent'),
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result).toEqual({ disableHidraw: false, enableSdl: false })
  })

  test('returns notSet when system.reg cannot be read', () => {
    const prefixPath = join(testDir, 'unreadable')
    mkdirSync(prefixPath, { recursive: true })
    // A directory in place of the file makes readFileSync throw (EISDIR)
    mkdirSync(join(prefixPath, 'system.reg'))

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result).toEqual({ disableHidraw: false, enableSdl: false })
  })

  test('returns notSet when winebus section is missing', () => {
    const prefixPath = join(testDir, 'prefix1')
    mkdirSync(prefixPath, { recursive: true })
    const content = `
[System\\\\CurrentControlSet\\\\Control\\\\Session Manager]
"Environment"=hex(7):00,00
`
    createMockSystemReg(content, prefixPath)

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result).toEqual({ disableHidraw: false, enableSdl: false })
  })

  test('detects DisableHidraw set to 1', () => {
    const prefixPath = join(testDir, 'prefix2')
    mkdirSync(prefixPath, { recursive: true })
    const content = `
[System\\\\ControlSet001\\\\Services\\\\winebus] 1781121710
"DisableHidraw"=dword:00000001
`
    createMockSystemReg(content, prefixPath)

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result.disableHidraw).toBe(true)
    expect(result.enableSdl).toBe(false)
  })

  test('detects Enable SDL set to 1', () => {
    const prefixPath = join(testDir, 'prefix3')
    mkdirSync(prefixPath, { recursive: true })
    const content = `
[System\\\\ControlSet001\\\\Services\\\\winebus] 1781121710
"Enable SDL"=dword:00000001
`
    createMockSystemReg(content, prefixPath)

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result.disableHidraw).toBe(false)
    expect(result.enableSdl).toBe(true)
  })

  test('detects both DisableHidraw and Enable SDL set to 1', () => {
    const prefixPath = join(testDir, 'prefix4')
    mkdirSync(prefixPath, { recursive: true })
    const content = `
[System\\\\ControlSet001\\\\Services\\\\winebus] 1781121710
"DisableHidraw"=dword:00000001
"Enable SDL"=dword:00000001
`
    createMockSystemReg(content, prefixPath)

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result.disableHidraw).toBe(true)
    expect(result.enableSdl).toBe(true)
  })

  test('ignores DisableHidraw set to 0', () => {
    const prefixPath = join(testDir, 'prefix5')
    mkdirSync(prefixPath, { recursive: true })
    const content = `
[System\\\\ControlSet001\\\\Services\\\\winebus] 1781121710
"DisableHidraw"=dword:00000000
`
    createMockSystemReg(content, prefixPath)

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result.disableHidraw).toBe(false)
  })

  test('works with Proton prefix structure (pfx/system.reg)', () => {
    const prefixPath = join(testDir, 'prefix6')
    mkdirSync(join(prefixPath, 'pfx'), { recursive: true })
    const content = `
[System\\\\ControlSet001\\\\Services\\\\winebus] 1781121710
"DisableHidraw"=dword:00000001
"Enable SDL"=dword:00000001
`
    createMockSystemReg(content, join(prefixPath, 'pfx'))

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'proton' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result.disableHidraw).toBe(true)
    expect(result.enableSdl).toBe(true)
  })

  test('handles malformed registry values gracefully', () => {
    const prefixPath = join(testDir, 'prefix7')
    mkdirSync(prefixPath, { recursive: true })
    const content = `
[System\\\\ControlSet001\\\\Services\\\\winebus] 1781121710
"DisableHidraw"=dword:not_a_number
"Enable SDL"=dword:00000001
`
    createMockSystemReg(content, prefixPath)

    const gameSettings = {
      winePrefix: prefixPath,
      wineVersion: { type: 'wine' }
    } as GameSettings

    const result = readWinebusHidrawState(gameSettings)
    expect(result.disableHidraw).toBe(false)
    expect(result.enableSdl).toBe(true)
  })
})
