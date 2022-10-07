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
  heroicGamesConfigPath,
  lastLogFile
} from '../constants'
import { app } from 'electron'
import { join } from 'path'
import { logError, LogPrefix } from './logger'

interface createLogFileReturn {
  currentLogFile: string
  lastLogFile: string
}

let longestPrefix = 0
export const getLongestPrefix = (): number => longestPrefix

/**
 * Creates a new log file in heroic config path under folder Logs.
 * It also removes old logs every new month.
 * @returns path to current log file
 */
export function createNewLogFileAndClearOldOnces(): createLogFileReturn {
  const date = new Date()
  const logDir = app.getPath('logs')
  const fmtDate = date.toISOString().replaceAll(':', '_')
  const newLogFile = join(logDir, `heroic-${fmtDate}.log`)
  try {
    openSync(newLogFile, 'w')
  } catch (error) {
    logError([`Open ${newLogFile} failed with`, error], {
      prefix: LogPrefix.Backend,
      skipLogToFile: true
    })
  }

  // Clean out logs that are more than a month old
  if (existsSync(logDir)) {
    try {
      const logs = readdirSync(logDir, {
        withFileTypes: true
      })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)

      logs.forEach((log) => {
        if (log.includes('heroic-')) {
          const dateString = log
            .replace('heroic-', '')
            .replace('.log', '')
            .replaceAll('_', ':')
          const logDate = new Date(dateString)
          if (
            logDate.getFullYear() < date.getFullYear() ||
            logDate.getMonth() < date.getMonth()
          ) {
            unlinkSync(`${logDir}/${log}`)
          }
        }
      })
    } catch (error) {
      logError([`Removing old logs in ${logDir} failed with`, error], {
        prefix: LogPrefix.Backend,
        skipLogToFile: true
      })
    }
  }

  let logs: createLogFileReturn = {
    currentLogFile: '',
    lastLogFile: ''
  }
  if (configStore.has('general-logs')) {
    logs = configStore.get('general-logs') as createLogFileReturn
  }

  logs.lastLogFile = logs.currentLogFile
  logs.currentLogFile = newLogFile

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
    ? join(heroicGamesConfigPath, props.appName + '-lastPlay.log')
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
    if (currentLogFile) {
      appendFileSync(currentLogFile, `${message}\n`)
    }
  } catch (error) {
    logError(['Writing log file failed with', error], {
      prefix: LogPrefix.Backend,
      skipLogToFile: true
    })
  }
}
