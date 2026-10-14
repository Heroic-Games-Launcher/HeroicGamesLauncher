import { sep } from 'path'
import { GlobalConfig } from 'backend/config'
import { logError, logWarning, LogPrefix } from 'backend/logger'
import { isMac, isWindows } from 'backend/constants/environment'
import type { InstallPlatform } from 'common/types'
import { AureliaError } from './aurelia'

/** Returned by every command when the integration is off. */
export const STEAM_DISABLED = 'Steam import disabled'

export function isSteamImportEnabled(): boolean {
  return !!GlobalConfig.get().getSettings().experimentalFeatures?.steamImport
}

export function describeError(error: unknown): string {
  return error instanceof AureliaError ? error.message : String(error)
}

/** Platform string recorded in `InstalledInfo`. */
const installPlatform = isWindows ? 'windows' : isMac ? 'osx' : 'linux'

/** Matched against Aurelia's `oslist` field. */
export const currentOsList = isWindows ? 'windows' : isMac ? 'macos' : 'linux'

/** Aurelia's `-p` value, or undefined when unsupported. */
export function aureliaPlatform(platform: string): string | undefined {
  const lc = String(platform).toLowerCase()
  if (lc.startsWith('win')) return 'windows'
  if (lc.startsWith('lin')) return 'linux'
  return undefined
}

/**
 * The platform Heroic should record for an installed Steam game
 */
export function installedPlatformFor(
  gamePlatform?: string | null
): InstallPlatform {
  switch (String(gamePlatform).toLowerCase()) {
    case 'windows':
      return 'windows'
    case 'macos':
    case 'osx':
      return 'osx'
    case 'linux':
      return 'linux'
    default:
      return installPlatform
  }
}

/** `-p <platform>` argument pair, or empty. */
export function platformArgs(platform: string): string[] {
  const mapped = aureliaPlatform(platform)
  return mapped ? ['-p', mapped] : []
}

/**
 * Normalises a chosen install path to the Steam **library root**
 */
export function toSteamLibraryRoot(path?: string): string | undefined {
  if (!path) return undefined
  const trimmed = path.replace(/[/\\]+$/, '')
  const segments = trimmed.split(/[/\\]/)
  const steamappsIdx = segments.findIndex(
    (segment) => segment.toLowerCase() === 'steamapps'
  )
  const root =
    steamappsIdx === -1 ? trimmed : segments.slice(0, steamappsIdx).join(sep)
  return root || undefined
}

interface SteamCallOptions<T> {
  /** Returned when disabled or on failure. */
  fallback: T
  /** Logged alongside the error text. */
  failure: string
  /** Warn instead of error. */
  level?: 'error' | 'warning'
}

/**
 * Runs an Aurelia-backed task behind the integration toggle
 */
export async function steamCall<T>(
  task: () => Promise<T>,
  { fallback, failure, level = 'error' }: SteamCallOptions<T>
): Promise<T> {
  if (!isSteamImportEnabled()) return fallback
  try {
    return await task()
  } catch (error) {
    const log = level === 'warning' ? logWarning : logError
    log([failure, describeError(error)], LogPrefix.Steam)
    return fallback
  }
}
