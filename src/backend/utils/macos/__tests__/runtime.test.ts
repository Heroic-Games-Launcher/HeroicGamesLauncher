import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GameSettings, WineInstallation } from 'common/types'
import { findD3DMetalFramework, parseMajorVersion } from '../d3dmetal'
import * as os from 'os'
import {
  appleChipGeneration,
  getMacWineEnv,
  getPerformanceFilter
} from '../index'

jest.mock('os', () => ({
  ...jest.requireActual<typeof os>('os'),
  cpus: jest.fn(() => [])
}))

const cpuModel = (model: string) =>
  jest.mocked(os.cpus).mockReturnValue([{ model } as os.CpuInfo])

const settings = (overrides: Partial<GameSettings>) =>
  ({
    wineVersion: { bin: '/wine/bin/wine', name: 'Wine', type: 'wine' },
    autoInstallDxvk: false,
    enableMetalFX: false,
    enviromentOptions: [],
    ...overrides
  }) as GameSettings

const toolkit: WineInstallation = {
  bin: '/gptk/bin/wine64',
  name: 'Game-Porting-Toolkit-3.0-3',
  type: 'toolkit'
}

describe('getMacWineEnv', () => {
  test('enables DLSS translation for D3DMetal and DXMT', () => {
    expect(
      getMacWineEnv(settings({ wineVersion: toolkit, enableMetalFX: true }))
    ).toEqual({
      D3DM_ENABLE_METALFX: '1'
    })
    expect(
      getMacWineEnv(
        settings({
          wineVersion: {
            bin: '/w/bin/wine',
            name: 'Wine-Staging-10.0-DXMT',
            type: 'wine'
          },
          enableMetalFX: true,
          autoInstallDxvk: true
        })
      )
    ).toEqual({ DXMT_ENABLE_NVEXT: '1' })
    expect(getMacWineEnv(settings({ wineVersion: toolkit }))).toEqual({})
  })

  test('turns on asynchronous shader compilation for DXVK', () => {
    expect(getMacWineEnv(settings({ autoInstallDxvk: true }))).toEqual({
      DXVK_ASYNC: '1'
    })
  })

  test('turns on DirectX Raytracing only on chips with ray tracing hardware', () => {
    const rayTracing = settings({ wineVersion: toolkit, macRayTracing: true })
    cpuModel('Apple M4 Max')
    expect(getMacWineEnv(rayTracing)).toEqual({ D3DM_SUPPORT_DXR: '1' })
    cpuModel('Apple M2 Pro')
    expect(getMacWineEnv(rayTracing)).toEqual({})
  })

  test("doesn't override variables the user set", () => {
    expect(
      getMacWineEnv(
        settings({
          wineVersion: toolkit,
          enableMetalFX: true,
          enviromentOptions: [{ key: 'D3DM_ENABLE_METALFX', value: '0' }]
        })
      )
    ).toEqual({})
  })
})

describe('getPerformanceFilter', () => {
  test('matches Wine processes or the native executable', () => {
    expect(
      getPerformanceFilter(false).layerName?.test('CAMetalLayer: WineMetalView')
    ).toBe(true)
    expect(getPerformanceFilter(true, '/Games/Game.app').processNames).toEqual([
      'Game'
    ])
  })
})

describe('findD3DMetalFramework', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-d3dmetal-'))
    mkdirSync(join(root, 'bin'))
    writeFileSync(join(root, 'bin/wine64'), '')
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  test.each([
    ['GPTK and Whisky', 'lib/external'],
    ["Apple's GPTK", 'lib/apple_gptk/external'],
    ['CrossOver', 'lib64/apple_gptk/external'],
    ['an unknown layout', 'lib/something/else']
  ])('finds the framework of %s', (_, location) => {
    const frameworkPath = join(root, location, 'D3DMetal.framework')
    mkdirSync(frameworkPath, { recursive: true })
    expect(
      findD3DMetalFramework({
        bin: join(root, 'bin/wine64'),
        name: 'x',
        type: 'toolkit'
      })?.frameworkPath
    ).toBe(frameworkPath)
  })

  test('returns nothing for Wine without D3DMetal', () => {
    mkdirSync(join(root, 'lib/wine'), { recursive: true })
    expect(
      findD3DMetalFramework({
        bin: join(root, 'bin/wine64'),
        name: 'x',
        type: 'wine'
      })
    ).toBeUndefined()
  })
})

test('appleChipGeneration', () => {
  expect(appleChipGeneration('Apple M4 Max')).toBe(4)
  expect(appleChipGeneration('Apple M10')).toBe(10)
  expect(appleChipGeneration('Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz')).toBe(
    0
  )
})

test('parseMajorVersion', () => {
  expect(parseMajorVersion('3.0')).toBe(3)
  expect(parseMajorVersion('2.1.1')).toBe(2)
  expect(parseMajorVersion('')).toBe(0)
})
