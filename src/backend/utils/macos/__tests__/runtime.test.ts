import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GameSettings, WineInstallation } from 'common/types'
import {
  detectD3DMetal,
  findD3DMetalFramework,
  parseMajorVersion
} from '../d3dmetal'
import { getMacWineEnv } from '../index'

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

test('parseMajorVersion', () => {
  expect(parseMajorVersion('3.0')).toBe(3)
  expect(parseMajorVersion('2.1.1')).toBe(2)
  expect(parseMajorVersion('')).toBe(0)
})

test('detectD3DMetal reuses the result while the framework plist is unchanged', async () => {
  const root = mkdtempSync(join(tmpdir(), 'heroic-d3dmetal-'))
  try {
    const framework = join(root, 'lib/external/D3DMetal.framework')
    mkdirSync(join(framework, 'Resources'), { recursive: true })
    mkdirSync(join(root, 'lib/wine/x86_64-windows'), { recursive: true })
    writeFileSync(
      join(framework, 'Resources/Info.plist'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleShortVersionString</key><string>3.1.2</string>
</dict></plist>`
    )
    const wine = {
      bin: join(root, 'bin/wine64'),
      lib: join(root, 'lib'),
      name: 'Game Porting Toolkit',
      type: 'toolkit' as const
    }
    const first = await detectD3DMetal(wine)
    const second = await detectD3DMetal(wine)
    expect(first).toMatchObject({ version: '3.1.2', major: 3 })
    expect(second).toBe(first)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
