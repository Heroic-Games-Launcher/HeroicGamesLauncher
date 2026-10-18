import { existsSync, readdirSync } from 'graceful-fs'
import { join } from 'path'
import type { GameSettings } from 'common/types'
import { detectD3DMetal, type D3DMetalRuntime } from './d3dmetal'
import {
  enableMetalFXInRunner,
  installMetalFXIntoPrefix,
  removeMetalFXFromPrefix
} from './metalfx'
import { ensureRegistryStrings } from './registry'

function isDXMT(settings: GameSettings) {
  return settings.wineVersion.name.endsWith('-DXMT')
}

/**
 * Environment variables for the Mac-specific settings of a Wine game.
 * Variables the user set in the game's environment table are left alone
 */
export function getMacWineEnv(settings: GameSettings): Record<string, string> {
  const env: Record<string, string> = {}

  if (settings.enableMetalFX) {
    if (isDXMT(settings)) env.DXMT_ENABLE_NVEXT = '1'
    else env.D3DM_ENABLE_METALFX = '1'
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

interface MacLaunchPreparation {
  settings: GameSettings
  /** The Wine prefix or CrossOver bottle folder */
  prefix: string
  /** Folders the game may be installed in */
  gameRoots: string[]
  /** Runs `reg` (with the given arguments) inside the prefix */
  runRegistryCommand: (args: string[]) => Promise<void>
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
  return lines
}

/**
 * Applies the Mac-specific settings of a game to its prefix and runner before
 * launch. Every step is idempotent and reverts itself when its setting is
 * turned off
 *
 * @returns Lines describing the setup, meant for the game log
 */
export async function prepareMacWineLaunch(
  preparation: MacLaunchPreparation
): Promise<string[]> {
  const { settings } = preparation
  const d3dmetal = isDXMT(settings)
    ? undefined
    : await detectD3DMetal(settings.wineVersion).catch(() => undefined)
  const lines = [describeRuntime(settings, d3dmetal)]
  try {
    lines.push(...(await syncMetalFX(preparation, d3dmetal)))
  } catch (error) {
    lines.push(`DLSS via MetalFX failed: ${String(error)}`)
  }
  return lines
}
