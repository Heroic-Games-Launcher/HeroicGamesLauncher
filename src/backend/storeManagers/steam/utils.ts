import { sep } from 'path'
import { logError, logWarning, LogPrefix } from 'backend/logger'
import { isMac, isWindows } from 'backend/constants/environment'
import type { InstallPlatform } from 'common/types'
import type { SteamDataKind } from 'common/types/steam'
import { sendFrontendMessage } from 'backend/ipc'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import { t } from 'i18next'
import { AureliaError } from './aurelia'

/** Returned by every command on macOS. */
export const STEAM_UNSUPPORTED = 'Steam is not supported on macOS'

// No Aurelia binaries for macOS
export function isSteamSupported(): boolean {
  return !isMac
}

export function describeError(error: unknown): string {
  if (!(error instanceof AureliaError)) return String(error)
  // Aurelia's hint says what to do.
  return error.hint ? `${error.message} (${error.hint})` : error.message
}

/** Aurelia refuses while Steam runs. */
export function isSteamRunningError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error)
  return text.includes('Steam is running')
}

export function steamRunningMessage(): string {
  return t(
    'box.error.steam-running',
    'Steam is running. Close Steam, then try again.'
  )
}

/** Dialog when Steam blocks the change. */
export function reportSteamRunning(error: unknown): void {
  if (!isSteamRunningError(error)) return
  showDialogBoxModalAuto({
    title: t('box.error.title', 'Error'),
    message: steamRunningMessage(),
    type: 'ERROR'
  })
}

/** Aurelia failed for lack of login. */
function isAuthRequired(error: unknown): boolean {
  return error instanceof AureliaError && error.kind === 'auth_required'
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
  /** Tell the game page what failed. */
  report?: { appId: string; data: SteamDataKind }
}

/**
 * Runs an Aurelia-backed task on supported platforms
 */
export async function steamCall<T>(
  task: () => Promise<T>,
  { fallback, failure, level = 'error', report }: SteamCallOptions<T>
): Promise<T> {
  if (!isSteamSupported()) return fallback
  try {
    return await task()
  } catch (error) {
    const log = level === 'warning' ? logWarning : logError
    log([failure, describeError(error)], LogPrefix.Steam)
    if (report) {
      sendFrontendMessage('steamDataFetchFailed', {
        ...report,
        authRequired: isAuthRequired(error)
      })
    }
    return fallback
  }
}
