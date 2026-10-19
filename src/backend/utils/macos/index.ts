import { existsSync, readdirSync } from 'graceful-fs'
import { cpus } from 'os'
import { basename, join } from 'path'
import type { GameSettings, WineInstallation } from 'common/types'
import {
  enableFrameGenerationInRunner,
  runnerOffersFrameGeneration,
  type FrameGenerationRunnerState
} from './d3dkmt'
import { detectD3DMetal, type D3DMetalRuntime } from './d3dmetal'
import { describeDisplayLimits, getMacDisplays } from './displays'
import { syncGamePatches } from './game_patches'
import { syncGraphicsPreset } from './graphics_presets'
import {
  enableMetalFXInRunner,
  installMetalFXIntoPrefix,
  removeMetalFXFromPrefix
} from './metalfx'
import { ensureRegistryStrings } from './registry'
import { syncUnrealTweaks } from './unreal'
import type { PerformanceFilter } from './performance_report'
import { getAppleGpuCoreCount } from '../systeminfo/gpu/mac'

export {
  captureMetalPerformance,
  formatPerformanceReport
} from './performance_report'

/** First macOS release whose MetalFX can interpolate frames (DLSS Frame Generation) */
const METALFX_FRAME_INTERPOLATION_MACOS = 26

/** First Apple chip generation with ray tracing hardware */
const HARDWARE_RAY_TRACING_CHIP = 3

function isDXMT(settings: GameSettings) {
  return settings.wineVersion.name.endsWith('-DXMT')
}

function macOSMajorVersion(): number {
  const version = process.getSystemVersion?.() ?? ''
  return parseInt(version.split('.')[0] ?? '', 10) || 0
}

/** The generation of an Apple Silicon chip (4 for "Apple M4 Max"), 0 for anything else */
export function appleChipGeneration(cpuModel = cpus()[0]?.model ?? ''): number {
  const match = cpuModel.match(/^Apple M(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Environment variables for the Mac-specific settings of a Wine game.
 * Variables the user set in the game's environment table are left alone
 */
export function getMacWineEnv(settings: GameSettings): Record<string, string> {
  const env: Record<string, string> = {}
  const { wineVersion } = settings
  const dxmt = isDXMT(settings)

  if (settings.enableMetalFX) {
    if (dxmt) env.DXMT_ENABLE_NVEXT = '1'
    else env.D3DM_ENABLE_METALFX = '1'
  }

  if (
    settings.macRayTracing &&
    !dxmt &&
    appleChipGeneration() >= HARDWARE_RAY_TRACING_CHIP
  ) {
    env.D3DM_SUPPORT_DXR = '1'
  }

  // Heroic installs the async fork of DXVK-macOS, which only compiles shaders
  // in the background (less stutter) when asked to
  if (wineVersion.type === 'wine' && settings.autoInstallDxvk && !dxmt) {
    env.DXVK_ASYNC = '1'
  }

  const userKeys = new Set(
    (settings.enviromentOptions ?? []).map(({ key }) => key)
  )
  for (const key of Object.keys(env)) {
    if (userKeys.has(key)) delete env[key]
  }
  return env
}

const DLSS_LOCATIONS = [
  '',
  'Engine/Plugins/Runtime/Nvidia/DLSS/Binaries/ThirdParty/Win64',
  'Engine/Plugins/Marketplace/DLSS/Binaries/ThirdParty/Win64'
]

function shipsDLSS(gameRoots: string[]): boolean {
  return gameRoots.some((root) => {
    if (
      DLSS_LOCATIONS.some((location) =>
        existsSync(join(root, location, 'nvngx_dlss.dll'))
      )
    ) {
      return true
    }
    // <Project>/Binaries/Win64, where most Unreal and many other games keep it
    try {
      return readdirSync(root).some((entry) =>
        existsSync(join(root, entry, 'Binaries', 'Win64', 'nvngx_dlss.dll'))
      )
    } catch {
      return false
    }
  })
}

export interface MacGameFolders {
  settings: GameSettings
  /** The Wine prefix or CrossOver bottle folder */
  prefix: string
  /** Folders the game may be installed in, used to recognize known games */
  gameRoots: string[]
}

interface MacLaunchPreparation extends MacGameFolders {
  /** Runs `reg` (with the given arguments) inside the prefix */
  runRegistryCommand: (args: string[]) => Promise<void>
}

/** Whether games can select DLSS, which then runs on MetalFX */
function canRunDLSS(
  settings: GameSettings,
  d3dmetal: D3DMetalRuntime | undefined
): boolean {
  if (!settings.enableMetalFX) return false
  return isDXMT(settings) || (d3dmetal?.major ?? 0) >= 3
}

/** Whether games can turn on DLSS Frame Generation, which then runs as MetalFX frame interpolation */
async function canRunFrameGeneration(
  settings: GameSettings,
  d3dmetal: D3DMetalRuntime | undefined
): Promise<boolean> {
  if (
    isDXMT(settings) ||
    !canRunDLSS(settings, d3dmetal) ||
    macOSMajorVersion() < METALFX_FRAME_INTERPOLATION_MACOS
  ) {
    return false
  }
  if (settings.wineVersion.type === 'crossover' || !d3dmetal?.windowsDllDir) {
    return true
  }
  return runnerOffersFrameGeneration(d3dmetal.windowsDllDir).catch(() => false)
}

async function syncHighestGraphics(
  { settings, prefix, gameRoots }: MacGameFolders,
  d3dmetal: D3DMetalRuntime | undefined
) {
  return syncGraphicsPreset(prefix, gameRoots, !!settings.macHighestGraphics, {
    dlss: canRunDLSS(settings, d3dmetal),
    frameGeneration: await canRunFrameGeneration(settings, d3dmetal),
    gpuCores: getAppleGpuCoreCount()
  })
}

function describeRuntime(
  settings: GameSettings,
  d3dmetal: D3DMetalRuntime | undefined
): string {
  if (isDXMT(settings))
    return 'Graphics translation: DXMT (Direct3D 11 to Metal)'
  if (d3dmetal) {
    return `Graphics translation: D3DMetal ${d3dmetal.version} (Direct3D 11/12 to Metal)`
  }
  if (settings.wineVersion.type === 'wine' && settings.autoInstallDxvk) {
    return 'Graphics translation: DXVK on MoltenVK (Direct3D 9-11 to Vulkan to Metal)'
  }
  return 'Graphics translation: WineD3D (OpenGL)'
}

async function syncMetalFX(
  preparation: MacLaunchPreparation,
  d3dmetal: D3DMetalRuntime | undefined
): Promise<string[]> {
  const { settings, prefix, gameRoots } = preparation
  const wine = settings.wineVersion

  if (!settings.enableMetalFX) {
    const restored = await removeMetalFXFromPrefix(prefix)
    const lines = restored.length
      ? [
          `DLSS via MetalFX disabled: restored ${restored.join(', ')} in the prefix`
        ]
      : []
    if (d3dmetal && d3dmetal.major >= 3 && shipsDLSS(gameRoots)) {
      lines.push(
        `This game ships DLSS and D3DMetal ${d3dmetal.version} can run it on MetalFX: turn on "DLSS via MetalFX" in the game's Wine settings to use it`
      )
    }
    return lines
  }

  if (isDXMT(settings)) {
    return [
      "DLSS via MetalFX: on through DXMT (Direct3D 11 games). Select DLSS in the game's graphics options"
    ]
  }
  if (!d3dmetal) {
    return [
      `DLSS via MetalFX needs D3DMetal 3 (Game Porting Toolkit 3) or DXMT, ${wine.name} has neither`
    ]
  }
  if (d3dmetal.major < 3) {
    return [
      `DLSS via MetalFX needs D3DMetal 3, but ${wine.name} ships D3DMetal ${d3dmetal.version}. Install Game Porting Toolkit 3 from the Wine Manager and select it for this game`
    ]
  }

  const lines: string[] = []
  if (wine.type !== 'crossover') {
    if (
      !d3dmetal.windowsDllDir ||
      !(await enableMetalFXInRunner(d3dmetal.windowsDllDir))
    ) {
      return [
        `DLSS via MetalFX: ${wine.name} doesn't include nvngx-on-metalfx.dll, so DLSS stays unavailable`
      ]
    }
    const copied = await installMetalFXIntoPrefix(
      prefix,
      d3dmetal.windowsDllDir
    )
    if (copied.length) {
      lines.push(`Copied ${copied.join(', ')} into the prefix's system32`)
    }
    // The NGX loader linked into games finds nvngx.dll through this value
    await ensureRegistryStrings(
      prefix,
      [
        {
          hive: 'HKLM',
          key: 'Software\\NVIDIA Corporation\\Global\\NGXCore',
          name: 'FullPath',
          data: 'C:\\Windows\\System32'
        }
      ],
      preparation.runRegistryCommand
    )
  }

  lines.push(
    `DLSS via MetalFX: on (D3DMetal ${d3dmetal.version}). Select DLSS in the game's graphics options`
  )
  if (macOSMajorVersion() < METALFX_FRAME_INTERPOLATION_MACOS) {
    lines.push(
      `DLSS Frame Generation needs macOS ${METALFX_FRAME_INTERPOLATION_MACOS} or newer, only DLSS upscaling is available`
    )
    return lines
  }
  const frameGeneration =
    wine.type === 'crossover' || !d3dmetal.windowsDllDir
      ? 'native'
      : await enableFrameGenerationInRunner(d3dmetal.windowsDllDir).catch(
          (error): FrameGenerationRunnerState => {
            lines.push(`Couldn't patch ${wine.name}'s gdi32.dll: ${error}`)
            return 'unsupported'
          }
        )
  if (frameGeneration === 'patched') {
    lines.push(
      `Patched ${wine.name}'s gdi32.dll to report hardware-accelerated GPU scheduling, which games require before offering DLSS Frame Generation (original kept as gdi32.dll.heroic-stock)`
    )
  }
  lines.push(
    frameGeneration === 'unsupported'
      ? `DLSS Frame Generation stays unavailable: ${wine.name}'s gdi32.dll can't report hardware-accelerated GPU scheduling, which games require for it`
      : 'DLSS Frame Generation, if the game offers it, runs as MetalFX frame interpolation'
  )
  return lines
}

function describeRayTracing(
  settings: GameSettings,
  d3dmetal: D3DMetalRuntime | undefined
): string[] {
  if (!settings.macRayTracing) return []
  if (!d3dmetal) {
    return [
      `Hardware ray tracing needs D3DMetal (Game Porting Toolkit or CrossOver), ${settings.wineVersion.name} doesn't have it`
    ]
  }
  if (appleChipGeneration() < HARDWARE_RAY_TRACING_CHIP) {
    return [
      `Hardware ray tracing needs an M${HARDWARE_RAY_TRACING_CHIP} or newer chip, so it stays off`
    ]
  }
  return [
    "Hardware ray tracing: on. Direct3D 12 games can now offer their ray-traced effects in the game's graphics options"
  ]
}

async function syncRetinaMode(
  preparation: MacLaunchPreparation
): Promise<string[]> {
  const enabled = !!preparation.settings.macRetinaMode
  const changed = await ensureRegistryStrings(
    preparation.prefix,
    [
      {
        hive: 'HKCU',
        key: 'Software\\Wine\\Mac Driver',
        name: 'RetinaMode',
        data: enabled ? 'y' : 'n'
      }
    ],
    preparation.runRegistryCommand,
    { 'Software\\Wine\\Mac Driver\\RetinaMode': 'n' }
  )
  return changed.length
    ? [`Retina mode turned ${enabled ? 'on' : 'off'} in the prefix`]
    : []
}

/**
 * Applies the Mac-specific settings of a game to its prefix and install
 * folder before launch. Every step is idempotent and reverts itself when its
 * setting is turned off; a failing step doesn't stop the others
 *
 * @returns Lines describing the setup, meant for the game log
 */
export async function prepareMacWineLaunch(
  preparation: MacLaunchPreparation
): Promise<string[]> {
  const { settings, prefix, gameRoots } = preparation
  const lines: string[] = []

  const d3dmetal = isDXMT(settings)
    ? undefined
    : await detectD3DMetal(settings.wineVersion).catch(() => undefined)
  lines.push(describeRuntime(settings, d3dmetal))

  const steps: Array<[string, () => string[] | Promise<string[]>]> = [
    ['DLSS via MetalFX', async () => syncMetalFX(preparation, d3dmetal)],
    ['Ray tracing', () => describeRayTracing(settings, d3dmetal)],
    ['Retina mode', async () => syncRetinaMode(preparation)],
    [
      'Unreal Engine tweaks',
      async () => {
        const result = await syncUnrealTweaks(
          prefix,
          gameRoots,
          !!settings.macUnrealTweaks
        )
        return result ? [result] : []
      }
    ],
    [
      'Game compatibility patches',
      async () => syncGamePatches(gameRoots, settings.macGamePatches !== false)
    ],
    [
      'Highest graphics settings',
      async () => {
        const result = await syncHighestGraphics(preparation, d3dmetal)
        return 'message' in result ? [result.message] : []
      }
    ],
    [
      'Displays',
      async () =>
        describeDisplayLimits(await getMacDisplays(), !!settings.macRetinaMode)
    ]
  ]

  for (const [name, step] of steps) {
    try {
      lines.push(...(await step()))
    } catch (error) {
      lines.push(`${name} failed: ${String(error)}`)
    }
  }
  return lines
}

/**
 * Applies the Mac-specific settings that need what the game saved while it
 * ran, after it exits
 *
 * @returns Lines describing what changed, meant for the game log
 */
export async function finishMacWineSession(
  folders: MacGameFolders
): Promise<string[]> {
  const { settings } = folders
  try {
    const d3dmetal = isDXMT(settings)
      ? undefined
      : await detectD3DMetal(settings.wineVersion).catch(() => undefined)
    const result = await syncHighestGraphics(folders, d3dmetal)
    return result.status === 'raised' ? [result.message] : []
  } catch (error) {
    return [`Highest graphics settings failed: ${String(error)}`]
  }
}

// CrossOver comes after GPTK because it stops working when its trial expires
const RUNNER_TYPE_PREFERENCE: Record<WineInstallation['type'], number> = {
  toolkit: 2,
  crossover: 1,
  wine: 0,
  proton: 0
}

/**
 * Sorts Wine builds from most to least capable on Apple Silicon: the newest
 * D3DMetal first (3.x adds DLSS via MetalFX), then GPTK, CrossOver and plain Wine
 */
export async function rankMacRunners(
  runners: WineInstallation[]
): Promise<WineInstallation[]> {
  const scored = await Promise.all(
    runners.map(async (runner, index) => {
      const d3dmetal = await detectD3DMetal(runner).catch(() => undefined)
      const score =
        (d3dmetal?.major ?? 0) * 10 + RUNNER_TYPE_PREFERENCE[runner.type]
      return { runner, score, index }
    })
  )
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ runner }) => runner)
}

/** Whether one of the runners has D3DMetal 3 or newer */
export async function hasModernD3DMetal(
  runners: WineInstallation[]
): Promise<boolean> {
  for (const runner of runners) {
    const d3dmetal = await detectD3DMetal(runner).catch(() => undefined)
    if (d3dmetal && d3dmetal.major >= 3) return true
  }
  return false
}

/**
 * Which process/layer presented a game's frames, for {@link captureMetalPerformance}
 */
export function getPerformanceFilter(
  isNative: boolean,
  executable?: string
): PerformanceFilter {
  if (!isNative) {
    return {
      processNames: ['wine64-preloader', 'wine-preloader', 'wine64', 'wine'],
      layerName: /WineMetalView/
    }
  }
  const name = executable ? basename(executable).replace(/\.app$/, '') : ''
  return { processNames: name ? [name] : [] }
}
