import { homedir } from 'os'
import { join } from 'path'

import { isMac, isWindows } from '../constants/environment'

import type { Runner } from 'common/types'
import type { RunnerOrComet } from './types'

/**
 * Returns the base directory to store all logs
 */
function getBaseLogPath(): string {
  if (isWindows) {
    const localAppData =
      process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
    return join(localAppData, 'Heroic', 'logs')
  }
  if (isMac) {
    return join(homedir(), 'Library', 'Logs', 'Heroic Games Launcher')
  }
  const stateHome =
    process.env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state')
  return join(stateHome, 'Heroic', 'logs')
}

// Which game log to return. By default, the launch log is returned.
type GameLogType =
  | 'launch'
  | 'install'
  | 'import'
  | 'repair'
  | 'update'
  | 'setup'
type GetLogFileArgs =
  // Heroic log
  | { appName?: undefined; runner?: undefined }
  // Runner log
  | { appName?: undefined; runner: RunnerOrComet }
  // Game log
  | { appName: string; runner: Runner; type?: GameLogType }

/**
 * Returns the path to the log file of a game / runner / Heroic
 * @param args Parameters to find the log file. See {@link GetLogFileArgs}
 */
function getLogFilePath(args: GetLogFileArgs): string {
  let relativeFilePath: string
  if (!(args?.appName || args?.runner)) {
    relativeFilePath = 'heroic'
  } else if (args.runner && !args.appName) {
    relativeFilePath = join('runners', args.runner)
  } else {
    const { appName, runner, type = 'launch' } = args
    relativeFilePath = join('games', `${appName}_${runner}`, type)
  }

  return join(getBaseLogPath(), relativeFilePath + '.log')
}

export { getLogFilePath }
export type { GameLogType, GetLogFileArgs }
