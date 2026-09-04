import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logWarning,
  getRunnerLogWriter
} from 'backend/logger'
import { libraryManagerMap } from '..'
import {
  checkWineBeforeLaunch,
  sendGameStatusUpdate,
  spawnAsync
} from 'backend/utils'
import { runWineCommand, verifyWinePrefix } from 'backend/launcher'
import { isWindows } from 'backend/constants/environment'
import type { Game } from 'common/types/game_manager'

/**
 * Handles installing dependencies for games that include PostInstall scripts
 */
export default async function setup(
  game: Game,
  installedPath?: string
): Promise<void> {
  const gameInfo = game.getGameInfo()
  if (!gameInfo) {
    logError([`Could not find game info for ${game.id}. Skipping setup`])
    return
  }

  const basePath = installedPath ?? gameInfo?.install.install_path
  if (!basePath) {
    logError([
      `Could not find install path for ${gameInfo.title}. Skipping setup`
    ])
    return
  }

  const fuel = libraryManagerMap['nile'].fetchFuelJSON(game.id, basePath)
  if (!fuel) {
    logError(
      [
        'Cannot install dependencies for',
        gameInfo.title,
        'without a fuel.json'
      ],
      LogPrefix.Nile
    )
    return
  }

  if (!fuel.PostInstall.length) {
    logInfo(['No PostInstall instructions for', gameInfo.title], LogPrefix.Nile)
    return
  }

  logWarning(
    'Running setup instructions, if you notice issues with launching a game, please report it on our Discord server',
    LogPrefix.Nile
  )

  const gameSettings = await game.getSettings()
  if (!isWindows) {
    const logWriter = getRunnerLogWriter('nile')
    const isWineOkToLaunch = await checkWineBeforeLaunch(game, logWriter)

    if (!isWineOkToLaunch) {
      logError(
        ['Was not possible to run setup using', gameSettings.wineVersion.name],
        LogPrefix.Nile
      )
      return
    }
    // Make sure prefix is initialized correctly
    await verifyWinePrefix(game)
  }

  logDebug(['PostInstall:', fuel.PostInstall], LogPrefix.Nile)

  sendGameStatusUpdate(game, {
    status: 'redist',
    context: 'AMAZON'
  })

  // Actual setup logic
  for (const action of fuel.PostInstall) {
    const exeArguments = action.Args ?? []

    if (isWindows) {
      const command = [
        '-NoProfile',
        'Start-Process',
        '-FilePath',
        action.Command
      ]
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

    await runWineCommand(game, {
      commandParts: [action.Command, ...exeArguments],
      wait: true,
      protonVerb: 'run',
      startFolder: basePath
    })
  }
}
