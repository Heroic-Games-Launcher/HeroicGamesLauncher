import { execAsync } from 'backend/utils'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { isFlatpak, isSteamDeckGameMode } from 'backend/constants/environment'

// Steam Deck (SteamOS) only for now
async function runPowerCommand(command: string) {
  const fullCommand = isFlatpak ? `flatpak-spawn --host ${command}` : command

  try {
    await execAsync(fullCommand)
    logInfo(`Executed power command: ${fullCommand}`, LogPrefix.Backend)
  } catch (error) {
    logError(
      [`Failed to execute power command: ${fullCommand}`, error],
      LogPrefix.Backend
    )
  }
}

export const shutdown = async () => runPowerCommand('systemctl poweroff')

export const suspend = async () => runPowerCommand('systemctl suspend')

export const turnOffScreen = async () => {
  // gamescope provides XWayland, so DPMS via xset works in game mode
  if (!isSteamDeckGameMode && process.env.XDG_SESSION_TYPE === 'wayland') {
    return runPowerCommand('kscreen-doctor --dpms off')
  }
  return runPowerCommand('xset dpms force off')
}
