import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { findProperty, parseGvas, structFields, mapEntry } from '../gvas'
import {
  GRAPHICS_PRESET_PROFILES,
  setTargetResolution,
  syncGraphicsPreset,
  upgradeGraphicsSave
} from '../graphics_presets'
import {
  SYSTEM_CLASS,
  hellblade2LowGraphics,
  hellblade2SystemSettings,
  nameProp,
  save
} from './gvas_fixtures'

const hellblade = GRAPHICS_PRESET_PROFILES[0]
const DLSS_ONLY = { dlss: true, frameGeneration: false, gpuCores: 32 }
const DLSS_AND_FRAME_GENERATION = {
  dlss: true,
  frameGeneration: true,
  gpuCores: 32
}
const ULTRAWIDE = { width: 5120, height: 1440 }

function targetRes(data: Buffer) {
  const value = findProperty(parseGvas(data).properties, 'TargetRes')?.value
  return value?.kind === 'raw'
    ? [value.data.readInt32LE(0), value.data.readInt32LE(4)]
    : undefined
}

function nameValue(
  properties: ReturnType<typeof parseGvas>['properties'] | undefined,
  name: string
) {
  const value = findProperty(properties ?? [], name)?.value
  return value?.kind === 'string' ? value.value : undefined
}

function readGraphics(data: Buffer) {
  const { properties } = parseGvas(data)
  const preset = structFields(
    findProperty(properties, 'GlobalQualityPreset')?.value
  )
  const dlss = structFields(
    mapEntry(findProperty(properties, 'UpscalerSettings'), 'DLSS')
  )
  const dynamicResolution = findProperty(
    properties,
    'IsDynamicResolution'
  )?.value
  return {
    preset: Object.fromEntries(
      (preset ?? []).map((field) => [field.name, nameValue(preset, field.name)])
    ),
    upscaler: nameValue(properties, 'UpscalerId'),
    dlssMode: nameValue(dlss, 'QualityModeId'),
    dlssFrameGeneration: nameValue(dlss, 'FrameGenerationId'),
    dlssFields: dlss?.map(({ name }) => name),
    dynamicResolution:
      dynamicResolution?.kind === 'bool' ? dynamicResolution.value : undefined
  }
}

describe('Highest graphics settings', () => {
  test('raises every quality setting and selects DLSS Quality', () => {
    const result = upgradeGraphicsSave(
      hellblade2LowGraphics(),
      hellblade,
      DLSS_ONLY
    )

    expect(result?.changes).toHaveLength(3)
    expect(result?.changes[2]).toBe(
      'upscaler: DLSS (on MetalFX) in Quality mode'
    )
    const graphics = readGraphics(result!.data)
    expect(Object.values(graphics.preset)).toEqual(Array(10).fill('High'))
    expect(graphics.dynamicResolution).toBe(false)
    expect(graphics.upscaler).toBe('DLSS')
    expect(graphics.dlssMode).toBe('Quality')
    expect(graphics.dlssFrameGeneration).toBe('None')
    // Properties are kept in the order the game writes them
    expect(parseGvas(result!.data).properties.map(({ name }) => name)).toEqual([
      'Gamma',
      'IsVSyncEnabled',
      'IsDynamicResolution',
      'GlobalQualityPreset',
      'UpscalerId',
      'ReflexId',
      'UpscalerSettings',
      'DataVersion'
    ])
  })

  test('leaves the upscaler alone without DLSS', () => {
    for (const [data, dlss] of [
      [hellblade2LowGraphics(), false],
      [hellblade2LowGraphics({ dlss: false }), true]
    ] as const) {
      const graphics = readGraphics(
        upgradeGraphicsSave(data, hellblade, {
          dlss,
          frameGeneration: true,
          gpuCores: 32
        })!.data
      )
      expect(graphics.upscaler).toBeUndefined()
      expect(graphics.dlssFrameGeneration).toBe(dlss ? undefined : 'None')
      expect(Object.values(graphics.preset)).toEqual(Array(10).fill('High'))
    }
  })

  test('picks the sharpest DLSS mode that renders at most as many pixels as 720p', () => {
    for (const [width, height, mode] of [
      [1920, 1080, 'Quality'],
      [1920, 1200, 'Balanced'],
      [2560, 1440, 'Performance'],
      [3840, 2160, 'UltraPerformance'],
      [5120, 1440, 'UltraPerformance'],
      [5120, 2880, 'UltraPerformance']
    ] as const) {
      const result = upgradeGraphicsSave(
        hellblade2LowGraphics(),
        hellblade,
        DLSS_ONLY,
        { width, height }
      )
      expect([width, height, readGraphics(result!.data).dlssMode]).toEqual([
        width,
        height,
        mode
      ])
    }
  })

  test('scales the DLSS pixel budget with the size of the GPU', () => {
    for (const [gpuCores, mode] of [
      [0, 'UltraPerformance'],
      [16, 'UltraPerformance'],
      [40, 'UltraPerformance'],
      [80, 'Performance']
    ] as const) {
      const result = upgradeGraphicsSave(
        hellblade2LowGraphics(),
        hellblade,
        { ...DLSS_ONLY, gpuCores },
        ULTRAWIDE
      )
      expect([gpuCores, readGraphics(result!.data).dlssMode]).toEqual([
        gpuCores,
        mode
      ])
    }
    const smallGpu = upgradeGraphicsSave(
      hellblade2LowGraphics(),
      hellblade,
      { ...DLSS_ONLY, gpuCores: 20 },
      { width: 1920, height: 1080 }
    )
    expect(readGraphics(smallGpu!.data).dlssMode).toBe('Performance')
  })

  test('turns on DLSS Frame Generation where the runner offers it', () => {
    const result = upgradeGraphicsSave(
      hellblade2LowGraphics(),
      hellblade,
      DLSS_AND_FRAME_GENERATION,
      ULTRAWIDE
    )

    expect(result?.changes[2]).toBe(
      'upscaler: DLSS (on MetalFX) in Ultra Performance mode for the 5120x1440 window, with DLSS Frame Generation (MetalFX frame interpolation)'
    )
    const graphics = readGraphics(result!.data)
    expect(graphics.dlssMode).toBe('UltraPerformance')
    expect(graphics.dlssFrameGeneration).toBe('On')
    expect(graphics.dlssFields).toEqual([
      'UpscalerId',
      'QualityModeId',
      'FrameGenerationId',
      'IsAutoSharpness',
      'Sharpness'
    ])
    const fsr3 = structFields(
      mapEntry(
        findProperty(parseGvas(result!.data).properties, 'UpscalerSettings'),
        'FSR3'
      )
    )
    expect(nameValue(fsr3, 'FrameGenerationId')).toBe('None')
  })

  test('changes nothing when the settings are already the highest', () => {
    for (const [options, windowSize] of [
      [DLSS_ONLY, undefined],
      [DLSS_AND_FRAME_GENERATION, ULTRAWIDE]
    ] as const) {
      const raised = upgradeGraphicsSave(
        hellblade2LowGraphics(),
        hellblade,
        options,
        windowSize
      )!.data
      expect(
        upgradeGraphicsSave(raised, hellblade, options, windowSize)
      ).toBeUndefined()
    }
  })

  test('refuses saves of another kind', () => {
    const other = save('/Script/Other.SaveModel', [nameProp('A', 'B')])
    expect(() => upgradeGraphicsSave(other, hellblade, DLSS_ONLY)).toThrow(
      'not /Script/NTUI.NTVMGraphicsSettingsSaveModel'
    )
  })

  describe('target resolution', () => {
    const window = { width: 5120, height: 1440 }

    test('replaces the resolution the game picked with the window size', () => {
      const result = setTargetResolution(
        hellblade2SystemSettings(true, [1843, 1008]),
        'TargetRes',
        window
      )
      // Only the point changes
      expect(result?.data).toEqual(hellblade2SystemSettings(true, [5120, 1440]))
      expect(result?.change).toBe(
        "resolution: 5120x1440, the size of the game's window (the game picked 1843x1008, and upscaled its image from a fraction of the window's resolution)"
      )
    })

    test('changes nothing when the resolution matches the window', () => {
      expect(
        setTargetResolution(
          hellblade2SystemSettings(true, [5120, 1440]),
          'TargetRes',
          window
        )
      ).toBeUndefined()
    })

    test('leaves saves without an IntPoint of that name alone', () => {
      const notAPoint = save(SYSTEM_CLASS, [nameProp('TargetRes', '1843x1008')])
      expect(
        setTargetResolution(notAPoint, 'TargetRes', window)
      ).toBeUndefined()
      expect(
        setTargetResolution(hellblade2SystemSettings(true), 'Missing', window)
      ).toBeUndefined()
    })
  })

  describe('before and after launches', () => {
    let root: string
    let prefix: string
    let gameRoot: string
    let saveGames: string
    const graphicsSave = () => join(saveGames, 'GraphicsSettings.Windows.sav')
    const systemSave = () => join(saveGames, 'SystemSettings.Windows.sav')
    const sync = async (enabled = true) =>
      syncGraphicsPreset(prefix, [gameRoot], enabled, DLSS_AND_FRAME_GENERATION)
    const writeGameSaves = (firstLaunchDone: boolean) => {
      writeFileSync(graphicsSave(), hellblade2LowGraphics())
      writeFileSync(systemSave(), hellblade2SystemSettings(firstLaunchDone))
    }
    const writeWindowSize = (width: number, height: number) => {
      const config = join(saveGames, '..', 'Config', 'Windows')
      mkdirSync(config, { recursive: true })
      writeFileSync(
        join(config, 'GameUserSettings.ini'),
        `[/Script/Engine.GameUserSettings]\r\nbUseVSync=False\r\nResolutionSizeX=${width}\r\nResolutionSizeY=${height}\r\nFullscreenMode=1\r\n`
      )
    }

    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), 'heroic-graphics-'))
      prefix = join(root, 'prefix')
      gameRoot = join(root, 'game')
      saveGames = join(
        prefix,
        'drive_c/users/crossover/AppData/Local/Hellblade2/Saved/SaveGames'
      )
      mkdirSync(saveGames, { recursive: true })
      mkdirSync(join(gameRoot, 'Hellblade2/Binaries/Win64'), {
        recursive: true
      })
      writeFileSync(join(gameRoot, hellblade.shippingBinary), '')
    })

    afterEach(() => rmSync(root, { recursive: true, force: true }))

    test('ignores games without a profile', async () => {
      rmSync(join(gameRoot, hellblade.shippingBinary))
      writeGameSaves(true)
      expect(await sync()).toEqual({ status: 'unchanged' })
      expect(readFileSync(graphicsSave())).toEqual(hellblade2LowGraphics())
    })

    test('waits until the game finished its first launch', async () => {
      expect((await sync()).status).toBe('waiting-for-first-launch')

      // The game saved its settings, but hasn't finished the first launch
      writeGameSaves(false)
      expect((await sync()).status).toBe('waiting-for-first-launch')
      expect(readFileSync(graphicsSave())).toEqual(hellblade2LowGraphics())
    })

    test('raises the settings once and keeps later changes', async () => {
      writeGameSaves(true)

      const result = await sync()
      expect(result.status).toBe('raised')
      expect(
        readGraphics(readFileSync(graphicsSave())).preset.ShadowQuality
      ).toBe('High')
      expect(existsSync(join(prefix, '.heroic-graphics.json'))).toBe(true)

      // The player lowers the settings in the game
      writeFileSync(graphicsSave(), hellblade2LowGraphics())
      expect(await sync()).toEqual({ status: 'unchanged' })
      expect(readFileSync(graphicsSave())).toEqual(hellblade2LowGraphics())
    })

    test('sets the target resolution to the window size once', async () => {
      writeGameSaves(true)
      writeFileSync(systemSave(), hellblade2SystemSettings(true, [1843, 1008]))
      writeWindowSize(5120, 1440)

      const result = await sync()
      expect(result.status).toBe('raised')
      expect(result.status === 'raised' && result.message).toContain(
        'upscaler: DLSS (on MetalFX) in Ultra Performance mode for the 5120x1440 window, with DLSS Frame Generation (MetalFX frame interpolation); resolution: 5120x1440'
      )
      expect(readFileSync(systemSave())).toEqual(
        hellblade2SystemSettings(true, [5120, 1440])
      )
      const graphics = readGraphics(readFileSync(graphicsSave()))
      expect(graphics.dlssMode).toBe('UltraPerformance')
      expect(graphics.dlssFrameGeneration).toBe('On')

      // The player picks a lower resolution in the game
      writeFileSync(systemSave(), hellblade2SystemSettings(true, [2560, 720]))
      expect(await sync()).toEqual({ status: 'unchanged' })
      expect(targetRes(readFileSync(systemSave()))).toEqual([2560, 720])
    })

    test('fixes the target resolution when the settings are already the highest', async () => {
      writeFileSync(
        graphicsSave(),
        upgradeGraphicsSave(
          hellblade2LowGraphics(),
          hellblade,
          DLSS_AND_FRAME_GENERATION,
          ULTRAWIDE
        )!.data
      )
      writeFileSync(systemSave(), hellblade2SystemSettings(true, [1843, 1008]))
      writeWindowSize(5120, 1440)

      const result = await sync()
      expect(result.status === 'raised' && result.message).toMatch(
        /SaveGames: resolution: 5120x1440, .*\. Changes made in the game from now on are kept$/
      )
    })

    test('keeps the target resolution and DLSS Quality without a saved window size', async () => {
      writeGameSaves(true)
      writeFileSync(systemSave(), hellblade2SystemSettings(true, [1843, 1008]))

      expect((await sync()).status).toBe('raised')
      expect(targetRes(readFileSync(systemSave()))).toEqual([1843, 1008])
      expect(readGraphics(readFileSync(graphicsSave())).dlssMode).toBe(
        'Quality'
      )
    })

    test('raises the settings again after the game started over', async () => {
      writeGameSaves(true)
      await sync()

      // The saves were deleted, so the game runs its first launch again
      rmSync(graphicsSave())
      rmSync(systemSave())
      expect((await sync()).status).toBe('waiting-for-first-launch')
      writeGameSaves(true)
      expect((await sync()).status).toBe('raised')
    })

    test('raises the settings again when the setting is turned back on', async () => {
      writeGameSaves(true)
      await sync()

      expect(await sync(false)).toEqual({ status: 'unchanged' })
      expect(existsSync(join(prefix, '.heroic-graphics.json'))).toBe(false)
      writeFileSync(graphicsSave(), hellblade2LowGraphics())
      expect((await sync()).status).toBe('raised')
    })
  })
})
