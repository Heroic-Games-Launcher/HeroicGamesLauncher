import { execAsync } from 'backend/utils'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { isFlatpak } from 'backend/constants/environment'

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

export const turnOffScreen = async () => runPowerCommand('xset dpms force off')
