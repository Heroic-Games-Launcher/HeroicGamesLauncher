import { existsSync, readFileSync } from 'graceful-fs'
import { join } from 'path'
import { isSteamDeckGameMode } from 'backend/constants/environment'

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
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
