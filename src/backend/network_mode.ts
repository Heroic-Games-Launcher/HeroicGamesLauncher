/**
 * @file  Defines the launcher's online/offline network mode.
 *
 * The mode is a global setting (`networkMode`) with three values:
 *   - 'auto'    (default): follow live connectivity detection. When the app
 *                          detects it is offline, no online checks are run.
 *   - 'online':  force online behaviour, always attempt online checks.
 *   - 'offline': force offline behaviour, never run online checks, rely on
 *                the locally cached release data.
 *
 * The mode is read directly from the config file (instead of going through
 * the GlobalConfig class) so this module stays free of circular imports and
 * can be used from any backend module.
 */
import { readFileSync } from 'graceful-fs'
import { configPath } from 'backend/constants/paths'
import { logDebug, LogPrefix } from 'backend/logger'
import { isOnline } from './online_monitor'

export type NetworkMode = 'auto' | 'online' | 'offline'

export const defaultNetworkMode: NetworkMode = 'auto'

/**
 * Read the current network mode from the config file.
 * Falls back to 'auto' if the setting is missing or unreadable.
 */
export function getNetworkMode(): NetworkMode {
  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    const settings = (parsed && parsed.defaultSettings) || parsed
    if (settings && settings.networkMode) {
      return settings.networkMode as NetworkMode
    }
  } catch {
    // config not present or unreadable yet, use default
  }
  return defaultNetworkMode
}

/**
 * Whether online checks (launcher self-updates, wine/tool release lookups,
 * winetricks/dxvk refresh, default wine download) should currently run.
 *
 *   - 'offline' mode -> always false (nothing calls out)
 *   - 'online'  mode -> always true
 *   - 'auto'    mode -> follow the live connectivity state
 */
export function shouldRunOnlineChecks(): boolean {
  const mode = getNetworkMode()

  if (mode === 'offline') return false
  if (mode === 'online') return true

  const result = isOnline()
  logDebug(
    [`Online checks (auto mode): ${result ? 'enabled' : 'skipped (offline)'}`],
    LogPrefix.Backend
  )
  return result
}
