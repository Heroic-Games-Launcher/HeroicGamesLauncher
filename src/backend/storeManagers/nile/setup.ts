import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logWarning
} from 'backend/logger/logger'
import { fetchFuelJSON, getGameInfo } from './library'
import { GameConfig } from 'backend/game_config'
import { isWindows } from 'backend/constants'
import { checkWineBeforeLaunch, spawnAsync } from 'backend/utils'
import { logFileLocation } from '../storeManagerCommon/games'
import { runWineCommand, verifyWinePrefix } from 'backend/launcher'

/**
 * Handles installing dependencies for games that include PostInstall scripts
 */
export default async function setup(
  appName: string,
  installedPath?: string
): Promise<void> {
  const gameInfo = getGameInfo(appName)
  const basePath = installedPath ?? gameInfo?.install.install_path
  if (!basePath) {
    logError([
      `Could not find install path for ${
        gameInfo?.title ?? appName
      }. Skipping setup`
    ])
    return
  }

  const fuel = fetchFuelJSON(appName, basePath)
  if (!fuel) {
    logError(
      [
        'Cannot install dependencies for',
        gameInfo?.title ?? appName,
        'without a fuel.json'
      ],
      LogPrefix.Nile
    )
    return
  }

  if (!fuel.PostInstall.length) {
    logInfo(
      ['No PostInstall instructions for', gameInfo?.title ?? appName],
      LogPrefix.Nile
    )
    return
  }

  logWarning(
    'Running setup instructions, if you notice issues with launching a game, please report it on our Discord server',
    LogPrefix.Nile
  )

  const gameSettings = GameConfig.get(appName).config
  if (!isWindows) {
    const isWineOkToLaunch = await checkWineBeforeLaunch(
      appName,
      gameSettings,
      logFileLocation(appName)
    )

    if (!isWineOkToLaunch) {
      logError(
        ['Was not possible to run setup using', gameSettings.wineVersion.name],
        LogPrefix.Nile
      )
      return
    }
    // Make sure prefix is initialized correctly
    await verifyWinePrefix(gameSettings)
  }

  logDebug(['PostInstall:', fuel.PostInstall], LogPrefix.Nile)
  // Actual setup logic
  for (const action of fuel.PostInstall) {
    const exeArguments = action.Args ?? []

    if (isWindows) {
      const command = ['Start-Process', '-FilePath', action.Command]
      if (exeArguments.length) {
        command.push('-ArgumentList', ...exeArguments)
      }
      logInfo(['Setup: Executing', command.join(' ')], LogPrefix.Nile)
      await spawnAsync('powershell', command, {
        cwd: basePath
      })
      continue
    }

    logInfo(
      ['Setup: Executing', [action.Command, ...exeArguments].join(' ')],
      LogPrefix.Nile
    )

    await runWineCommand({
      gameSettings,
      gameInstallPath: basePath,
      commandParts: [action.Command, ...exeArguments],
      wait: true,
      protonVerb: 'waitforexitandrun',
      startFolder: basePath
    })
  }
}
