import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'graceful-fs'
import { join } from 'path'
import { isSteamDeckGameMode, isWindows } from 'backend/constants/environment'

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * The Windows Steam client does not write a pid file, it stores its
 * pid in the registry instead.
 */
function getWindowsSteamPid(): number | null {
  const result = spawnSync(
    'reg',
    ['query', 'HKCU\\Software\\Valve\\Steam\\ActiveProcess', '/v', 'pid'],
    { encoding: 'utf-8', windowsHide: true }
  )
  const match = result.stdout?.match(/REG_DWORD\s+(0x[0-9a-fA-F]+)/)
  if (!match) {
    return null
  }
  const pid = parseInt(match[1], 16)
  return pid > 0 ? pid : null
}

/**
 * Best-effort check if the Steam client is currently running.
 * Steam only reads shortcuts.vdf on startup and overwrites it on exit,
 * so editing the file while Steam runs silently loses the changes.
 * @param steamPath Path to the Steam install folder
 */
function isSteamRunning(steamPath: string): boolean {
  if (isSteamDeckGameMode) {
    return true
  }

  if (isWindows) {
    const pid = getWindowsSteamPid()
    return pid !== null && isPidAlive(pid)
  }

  const pidFiles = [
    join(steamPath, '..', 'steam.pid'),
    join(steamPath, 'steam.pid')
  ]

  for (const pidFile of pidFiles) {
    if (!existsSync(pidFile)) {
      continue
    }
    const pid = parseInt(readFileSync(pidFile, 'utf-8').trim())
    if (!isNaN(pid) && isPidAlive(pid)) {
      return true
    }
  }

  return false
}

export { isSteamRunning }
