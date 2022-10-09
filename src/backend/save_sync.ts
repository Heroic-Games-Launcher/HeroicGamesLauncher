import { Runner } from 'common/types'
import { setupWineEnvVars } from './launcher'
import { runLegendaryCommand, LegendaryLibrary } from './legendary/library'
import { logDebug, LogPrefix, logInfo, logError } from './logger/logger'
import { getGame } from './utils'

async function getDefaultSavePath(appName: string, runner: Runner) {
  switch (runner) {
    case 'legendary':
      return getDefaultLegendarySavePath(appName)
    case 'gog':
      // TODO: Move save path computing for GOG into this function as well,
      //       to comply with our "Make the frontend dumb" philosophy
      throw new Error('getDefaultSavePath only supports Legendary')
  }
}

async function getDefaultLegendarySavePath(appName: string): Promise<string> {
  const game = getGame(appName, 'legendary')
  const { save_path } = game.getGameInfo()
  if (save_path) {
    logDebug(['Got default save path from GameInfo:', save_path], {
      prefix: LogPrefix.Legendary
    })
    return save_path
  }
  // If Legendary doesn't have a save folder set yet, run it & accept its generated path
  // TODO: This whole interaction is a little weird, maybe ask Rodney if he's willing to
  //       make this a little smoother to automate
  logInfo(['Computing default save path for', appName], {
    prefix: LogPrefix.Legendary
  })
  // NOTE: The easiest way I've found to just compute the path is by running the sync
  //       and disabling both save up- and download
  let gotSavePath = false
  await runLegendaryCommand(
    ['sync-saves', appName, '--skip-upload', '--skip-download'],
    {
      logMessagePrefix: 'Getting default save path',
      env: setupWineEnvVars(await game.getSettings()),
      onOutput: (output, child) => {
        if (output.includes('Is this correct?')) {
          gotSavePath = true
          child.stdin?.cork()
          child.stdin?.write('y\n')
          child.stdin?.uncork()
        } else if (
          output.includes(
            'Path contains unprocessed variables, please enter the correct path manually'
          )
        ) {
          child.kill()
          logError(
            [
              'Legendary was unable to compute the default save path of',
              appName
            ],
            { prefix: LogPrefix.Legendary }
          )
        }
      }
    }
  )
  if (!gotSavePath) {
    logError(['Unable to compute default save path for', appName], {
      prefix: LogPrefix.Legendary
    })
    return ''
  }
  // If the save path was computed successfully, Legendary will have saved
  // this path in `installed.json` (so the GameInfo)
  // `= ''` here just in case Legendary failed to write the file
  const { save_path: new_save_path = '' } = LegendaryLibrary.get().getGameInfo(
    appName,
    true
  )!
  logInfo(['Computed save path:', new_save_path], {
    prefix: LogPrefix.Legendary
  })
  return new_save_path
}

export { getDefaultSavePath }
