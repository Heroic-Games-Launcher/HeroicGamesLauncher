import {
  existsSync,
  openSync,
  readdirSync,
  unlinkSync,
  appendFileSync
} from 'graceful-fs'

import {
  configStore,
  currentLogFile,
  gamesConfigPath,
  lastLogFile
} from '../constants'
import { app } from 'electron'
import { join } from 'path'
import { logError, LogPrefix, logsDisabled } from './logger'

interface createLogFileReturn {
  currentLogFile: string
  lastLogFile: string
  legendaryLogFile: string
  gogdlLogFile: string
  nileLogFile: string
}

let longestPrefix = 0
export const getLongestPrefix = (): number => longestPrefix

const createLogFile = (filePath: string) => {
  try {
    openSync(filePath, 'w')
  } catch (error) {
    logError([`Open ${filePath} failed with`, error], {
      prefix: LogPrefix.Backend,
      skipLogToFile: true
    })
  }
}

/**
 * Creates a new log file in heroic config path under folder Logs.
 * It also removes old logs every new month.
 * @returns path to current log file
 */
export function createNewLogFileAndClearOldOnes(): createLogFileReturn {
  const date = new Date()
  const logDir = app.getPath('logs')
  const fmtDate = date
    .toISOString()
    .replaceAll(':', '_')
    .replace(/\.\d\d\dZ/, '')
  const newLogFile = join(logDir, `${fmtDate}-heroic.log`)
  const newLegendaryLogFile = join(logDir, `${fmtDate}-legendary.log`)
  const newGogdlLogFile = join(logDir, `${fmtDate}-gogdl.log`)
  const newNileLogFile = join(logDir, `${fmtDate}-nile.log`)

  createLogFile(newLogFile)
  createLogFile(newLegendaryLogFile)
  createLogFile(newGogdlLogFile)
  createLogFile(newNileLogFile)

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
 * @param appName     if given returns game log
 * @param defaultLast if set getting heroic default last log
 * @returns path to log file
 */
export function getLogFile(props: {
  appName?: string
  defaultLast?: boolean
}): string {
  return props.appName
    ? join(gamesConfigPath, props.appName + '-lastPlay.log')
    : props.defaultLast
    ? lastLogFile
    : currentLogFile
}

/**
 * Appends given message to the current log file
 * @param message message to append
 */
export function appendMessageToLogFile(message: string) {
  try {
    if (!logsDisabled && currentLogFile) {
      appendFileSync(currentLogFile, `${message}\n`)
    }
  } catch (error) {
    logError(['Writing log file failed with', error], {
      prefix: LogPrefix.Backend,
      skipLogToFile: true
    })
  }
}
