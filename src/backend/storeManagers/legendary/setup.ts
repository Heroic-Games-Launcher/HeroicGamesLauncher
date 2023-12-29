import { getGameInfo, runWineCommandOnGame } from './games'
import { getInstallInfo } from './library'
import { sendGameStatusUpdate } from 'backend/utils'

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

  if (
    gameInfo.install?.platform === 'Windows' ||
    gameInfo.install?.platform === 'Win32'
  ) {
    const info = await getInstallInfo(appName, gameInfo.install.platform)
    if (
      info.manifest.prerequisites &&
      info.manifest.prerequisites.name.length > 0
    ) {
      await runWineCommandOnGame(appName, {
        commandParts: [
          info.manifest.prerequisites.path,
          info.manifest.prerequisites.args
        ],
        wait: true,
        protonVerb: 'waitforexitandrun'
      })
    }
  }
}
