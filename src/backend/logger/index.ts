import { GameConfig } from 'backend/game_config'
import { GlobalConfig } from 'backend/config'
import { formatSystemInfo, getSystemInfo } from 'backend/utils/systeminfo'
import { backendEvents } from 'backend/backend_events'

import { LogPrefix, RunnerToLogPrefixMap } from './constants'
import LogWriter from './log_writer'
import { GameLogType, getLogFilePath } from './paths'

import type { Runner } from 'common/types'
import type { RunnerOrComet } from './types'

let heroicLogWriter: LogWriter
const runnerLogWriters = new Map<RunnerOrComet, LogWriter>()

const logDebug = (...params: Parameters<LogWriter['logDebug']>) => {
  heroicLogWriter.logDebug(...params)
}
const logInfo = (...params: Parameters<LogWriter['logInfo']>) => {
  heroicLogWriter.logInfo(...params)
}
const logWarning = (...params: Parameters<LogWriter['logWarning']>) => {
  heroicLogWriter.logWarning(...params)
}
const logError = (...params: Parameters<LogWriter['logError']>) => {
  heroicLogWriter.logError(...params)
}

function getRunnerLogWriter(runner: RunnerOrComet) {
  const writer = runnerLogWriters.get(runner)
  if (writer) return writer

  const globalConfig = GlobalConfig.get().getSettings()
  const newWriter = new LogWriter(
    getLogFilePath({ runner }),
    false,
    globalConfig.disableLogs
  )
  runnerLogWriters.set(runner, newWriter)
  return newWriter
}

async function createGameLogWriter(
  appName: string,
  runner: Runner,
  type: GameLogType = 'launch'
): Promise<LogWriter> {
  const logsDisabledGlobally = GlobalConfig.get().getSettings().disableLogs
  const logsDisabledPerGame =
    type === 'launch'
      ? !(await GameConfig.get(appName).getSettings()).verboseLogs
      : false

  return new LogWriter(
    getLogFilePath({ appName, runner, type }),
    false,
    logsDisabledGlobally || logsDisabledPerGame
  )
}

function init() {
  // Add a basic error handler to our stdout/stderr. If we don't do this,
  // the main `process.on('uncaughtException', ...)` handler catches them (and
  // presents an error message to the user, which is hardly necessary for
  // "just" failing to write to the streams)
  for (const channel of ['stdout', 'stderr'] as const) {
    process[channel].once('error', (error: Error) => {
      heroicLogWriter.writeString(`Error writing to ${channel}: ${error.stack}`)

      process[channel].on('error', () => {
        // Silence further write errors
      })
    })
  }

  const globalSettings = GlobalConfig.get().getSettings()
  heroicLogWriter = new LogWriter(
    getLogFilePath({}),
    true,
    globalSettings.disableLogs
  )

  if (globalSettings.disableLogs)
    heroicLogWriter.logWarning(
      'IMPORTANT: Logs are disabled. Enable logs before reporting any issue',
      { forceLog: true }
    )

  heroicLogWriter.logInfo(
    ['System Information:', getSystemInfo().then(formatSystemInfo)],
    LogPrefix.Backend
  )

  backendEvents.on('settingChanged', ({ key, oldValue, newValue }) =>
    heroicLogWriter.logInfo([
      'Settings key',
      key,
      'changed from',
      oldValue,
      'to',
      newValue
    ])
  )
}

export {
  init,
  logDebug,
  logInfo,
  logWarning,
  logError,
  getRunnerLogWriter,
  createGameLogWriter,
  LogPrefix,
  RunnerToLogPrefixMap,
  getLogFilePath
}
