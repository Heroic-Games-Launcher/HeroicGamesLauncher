import { join } from 'path'
import { getGameInfo } from './games'
import { getInstallInfo } from './library'
import { sendGameStatusUpdate } from 'backend/utils'
import { enable, getStatus, isEnabled } from './eos_overlay/eos_overlay'
import { split } from 'shlex'
import { logError } from 'backend/logger/logger'
import { runWineCommand } from 'backend/launcher'
import { getGameConfig } from '../../config/game'

export const legendarySetup = async (appName: string) => {
  const gameInfo = getGameInfo(appName)
  if (!gameInfo) {
    return
  }

  sendGameStatusUpdate({
    appName,
    runner: 'legendary',
    status: 'redist',
    context: 'EPIC'
  })

  // Fixes games like Fallout New Vegas and Dishonored: Death of the Outsider
  await runWineCommand({
    commandParts: [
      'reg',
      'add',
      'HKEY_CLASSES_ROOT\\com.epicgames.launcher',
      '/f'
    ],
    wait: true,
    protonVerb: 'run',
    gameConfig: getGameConfig(appName, 'legendary')
  })

  const winPlatforms = ['Windows', 'Win32', 'windows']
  if (
    gameInfo.install.platform &&
    winPlatforms.includes(gameInfo.install.platform)
  ) {
    try {
      const info = await getInstallInfo(appName, gameInfo.install.platform)
      if (
        info.manifest.prerequisites &&
        info.manifest.prerequisites.path.length > 0
      ) {
        await runWineCommand({
          commandParts: [
            join(
              gameInfo.install.install_path ?? '',
              info.manifest.prerequisites.path
            ),
            ...split(info.manifest.prerequisites.args)
          ],
          wait: true,
          protonVerb: 'run',
          gameConfig: getGameConfig(appName, 'legendary')
        })
      }
    } catch (error) {
      logError(`getInstallInfo failed with ${error}`)
    }
  }

  const isOverlayEnabled = await isEnabled(appName)

  if (getStatus().isInstalled && !isOverlayEnabled) {
    await enable(appName)
  }
}
