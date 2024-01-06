import { join } from 'path'
import { getGameInfo, runWineCommandOnGame } from './games'
import { getInstallInfo } from './library'
import { sendGameStatusUpdate } from 'backend/utils'
import { enable, getStatus, isEnabled } from './eos_overlay/eos_overlay'
import { split } from 'shlex'
import { logError } from 'backend/logger/logger'

export const legendarySetup = async (appName: string) => {
  const gameInfo = getGameInfo(appName)
  if (!gameInfo) {
    return
  }

  sendGameStatusUpdate({
    appName,
    runner: 'legendary',
    status: 'prerequisites'
  })

  // Fixes games like Fallout New Vegas and Dishonored: Death of the Outsider
  await runWineCommandOnGame(appName, {
    commandParts: [
      'reg',
      'add',
      'HKEY_CLASSES_ROOT\\com.epicgames.launcher',
      '/f'
    ],
    wait: true,
    protonVerb: 'waitforexitandrun'
  })

  const isOverlayEnabled = await isEnabled(appName)

  if (getStatus().isInstalled && !isOverlayEnabled) {
    await enable(appName)
  }
}
