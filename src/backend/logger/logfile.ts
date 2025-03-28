import { existsSync, readdirSync, unlinkSync } from 'graceful-fs'

import { app } from 'electron'
import { join } from 'path'
import {
  appendHeroicLog,
  initHeroicLog,
  initRunnerLog,
  lastPlayLogFileLocation,
  logError,
  LogPrefix,
  logsDisabled
} from './logger'
import { configStore } from 'backend/constants/key_value_stores'

interface createLogFileReturn {
  currentLogFile: string
  lastLogFile: string
  legendaryLogFile: string
  gogdlLogFile: string
  nileLogFile: string
}

let longestPrefix = 0
export const getLongestPrefix = (): number => longestPrefix

/**
 * Creates a new log file in heroic config path under folder Logs.
 * It also removes old logs every new month.
 * @returns path to current log file
 */
export function createNewLogFileAndClearOldOnes(): createLogFileReturn {
  const date = new Date()
  let logDir = ''
  try {
    logDir = app.getPath('logs')
  } catch (error) {
    console.log(`Could not get 'logs' directory. ${error}`)
    return {
      currentLogFile: '',
      lastLogFile: '',
      legendaryLogFile: '',
      gogdlLogFile: '',
      nileLogFile: ''
    }
  }

  const fmtDate = date
    .toISOString()
    .replaceAll(':', '_')
    .replace(/\.\d\d\dZ/, '')
  const newLogFile = join(logDir, `${fmtDate}-heroic.log`)
  const newLegendaryLogFile = join(logDir, `${fmtDate}-legendary.log`)
  const newGogdlLogFile = join(logDir, `${fmtDate}-gogdl.log`)
  const newNileLogFile = join(logDir, `${fmtDate}-nile.log`)

  initHeroicLog(newLogFile)
  initRunnerLog('legendary', newLegendaryLogFile)
  initRunnerLog('gog', newGogdlLogFile)
  initRunnerLog('nile', newNileLogFile)

  const logs = configStore.get('general-logs', {
    currentLogFile: '',
    lastLogFile: '',
    legendaryLogFile: '',
    gogdlLogFile: '',
    nileLogFile: ''
  })

  const keep = [
    newLogFile,
    newLegendaryLogFile,
    newGogdlLogFile,
    newNileLogFile,
    logs.currentLogFile,
    logs.legendaryLogFile,
    logs.gogdlLogFile,
    logs.nileLogFile
  ]

  // Keep only the last 2 files for each log
  if (existsSync(logDir)) {
    try {
      const logs = readdirSync(logDir, {
        withFileTypes: true
      })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .filter((filename) => !keep.includes(join(logDir, filename)))

      logs.forEach((log) => unlinkSync(join(logDir, log)))
    } catch (error) {
      logError([`Removing old logs in ${logDir} failed with`, error], {
        prefix: LogPrefix.Backend,
        skipLogToFile: true
      })
    }
  }

  logs.lastLogFile = logs.currentLogFile
  logs.currentLogFile = newLogFile
  logs.legendaryLogFile = newLegendaryLogFile
  logs.gogdlLogFile = newGogdlLogFile
  logs.nileLogFile = newNileLogFile

  configStore.set('general-logs', logs)

  // get longest prefix to log lines in a kind of table
  for (const prefix in LogPrefix) {
    if (longestPrefix < String(prefix).length) {
      longestPrefix = String(prefix).length
    }
  }

  return logs
}

/**
 * Returns according to options the fitting log file
 * @param appNameOrRunner     if given returns game log
 * @returns path to log file
 */
export function getLogFile(appNameOrRunner: string): string {
  const logs = configStore.get('general-logs', {
    currentLogFile: '',
    lastLogFile: '',
    legendaryLogFile: '',
    gogdlLogFile: '',
    nileLogFile: ''
  })

  switch (appNameOrRunner) {
    case 'heroic':
      return logs.currentLogFile
    case 'legendary':
      return logs.legendaryLogFile
    case 'gogdl':
      return logs.gogdlLogFile
    case 'nile':
      return logs.nileLogFile
    default:
      return lastPlayLogFileLocation(appNameOrRunner)
  }
}

/**
 * Appends given message to the current log file
 * @param message message to append
 */
export function appendMessageToLogFile(message: string) {
  try {
    if (!logsDisabled) {
      appendHeroicLog(`${message}\n`)
    }
  } catch (error) {
    logError(['Writing log file failed with', error], {
      prefix: LogPrefix.Backend,
      skipLogToFile: true
    })
  }
}
