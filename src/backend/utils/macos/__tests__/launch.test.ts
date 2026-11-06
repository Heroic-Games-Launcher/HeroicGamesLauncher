import type { GameSettings, WineInstallation } from 'common/types'
import { detectD3DMetal } from '../d3dmetal'
import { installMetalFXIntoPrefix, removeMetalFXFromPrefix } from '../metalfx'
import { ensureRegistryStrings } from '../registry'
import { metalFXProblem, prepareMacWineLaunch } from '../index'

jest.mock('../d3dmetal', () => ({
  detectD3DMetal: jest.fn()
}))
jest.mock('../metalfx', () => ({
  installMetalFXIntoPrefix: jest.fn(),
  removeMetalFXFromPrefix: jest.fn()
}))
jest.mock('../registry', () => ({
  ensureRegistryStrings: jest.fn(() => Promise.resolve([]))
}))

const detect = jest.mocked(detectD3DMetal)
const install = jest.mocked(installMetalFXIntoPrefix)
const remove = jest.mocked(removeMetalFXFromPrefix)
const registry = jest.mocked(ensureRegistryStrings)

const toolkit: WineInstallation = {
  bin: '/gptk/bin/wine64',
  name: 'Game-Porting-Toolkit-3.0-3',
  type: 'toolkit'
}

const settings = (overrides: Partial<GameSettings> = {}) =>
  ({
    wineVersion: toolkit,
    enableMetalFX: true,
    enviromentOptions: [],
    ...overrides
  }) as GameSettings

const d3dmetal = {
  version: '3.0',
  major: 3,
  frameworkPath: '/gptk/D3DMetal.framework',
  windowsDllDir: '/gptk/lib/wine/x86_64-windows'
}

async function prepare(gameSettings: GameSettings) {
  const runRegistryCommand = jest.fn(() => Promise.resolve())
  const lines = await prepareMacWineLaunch({
    settings: gameSettings,
    prefix: '/prefix',
    gameRoots: [],
    runRegistryCommand
  })
  return { lines, runRegistryCommand }
}

beforeEach(() => {
  detect.mockReset()
  install.mockReset()
  remove.mockReset()
  registry.mockClear()
  remove.mockResolvedValue([])
  install.mockResolvedValue({ available: true, copied: ['nvngx.dll'] })
  detect.mockResolvedValue(d3dmetal)
})

describe('prepareMacWineLaunch MetalFX', () => {
  test('installs into the prefix for GPTK and CrossOver without editing the runner', async () => {
    const gptk = await prepare(settings())
    expect(install).toHaveBeenCalledWith('/prefix', d3dmetal.windowsDllDir)
    expect(gptk.lines.join('\n')).toContain('DLSS via MetalFX: on')
    expect(metalFXProblem(gptk.lines)).toBeUndefined()

    install.mockClear()
    const crossover = await prepare(
      settings({
        wineVersion: {
          bin: '/cx/bin/wine',
          name: 'CrossOver',
          type: 'crossover'
        }
      })
    )
    expect(install).toHaveBeenCalledWith('/prefix', d3dmetal.windowsDllDir)
    expect(crossover.lines.join('\n')).toContain('DLSS via MetalFX: on')
  })

  test('removes a stale prefix copy when the runner cannot translate DLSS', async () => {
    remove.mockResolvedValue(['nvngx.dll'])
    detect.mockResolvedValue(undefined)

    const missing = await prepare(settings())
    expect(remove).toHaveBeenCalledWith('/prefix')
    expect(install).not.toHaveBeenCalled()
    expect(metalFXProblem(missing.lines)).toContain('needs D3DMetal 3')

    detect.mockResolvedValue({ ...d3dmetal, major: 2, version: '2.1' })
    const old = await prepare(settings())
    expect(metalFXProblem(old.lines)).toContain('needs D3DMetal 3')

    install.mockResolvedValue({ available: false, copied: [] })
    detect.mockResolvedValue(d3dmetal)
    const noNgx = await prepare(settings())
    expect(metalFXProblem(noNgx.lines)).toContain('nvngx-on-metalfx.dll')
  })

  test('drops the prefix copy for DXMT so it cannot shadow NVEXT', async () => {
    const result = await prepare(
      settings({
        wineVersion: {
          bin: '/w/bin/wine',
          name: 'Wine-Staging-10.0-DXMT',
          type: 'wine'
        }
      })
    )
    expect(detect).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith('/prefix')
    expect(install).not.toHaveBeenCalled()
    expect(result.lines.join('\n')).toContain('on through DXMT')
    expect(metalFXProblem(result.lines)).toBeUndefined()
  })

  test('restores the prefix when the toggle is off', async () => {
    remove.mockResolvedValue(['nvngx.dll', 'nvapi64.dll'])
    const result = await prepare(settings({ enableMetalFX: false }))
    expect(install).not.toHaveBeenCalled()
    expect(result.lines.join('\n')).toContain('DLSS via MetalFX disabled')
    expect(registry).toHaveBeenCalled()
    const overrides = registry.mock.calls[0][1]
    expect(overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'nvngx', data: 'builtin' }),
        expect.objectContaining({ name: 'nvapi64', data: 'builtin' })
      ])
    )
  })
})
