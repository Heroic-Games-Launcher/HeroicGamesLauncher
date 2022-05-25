/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import { openSync, readdirSync, unlinkSync, appendFileSync } from 'graceful-fs'

import {
  configStore,
  currentLogFile,
  heroicGamesConfigPath,
  lastLogFile
} from '../constants'
import { app } from 'electron'
import { join } from 'path'

export enum LogPrefix {
  General = '',
  Legendary = 'Legendary',
  Gog = 'Gog',
  WineDownloader = 'WineDownloader',
  DXVKInstaller = 'DXVKInstaller',
  GlobalConfig = 'GlobalConfig',
  GameConfig = 'GameConfig',
  ProtocolHandler = 'ProtocolHandler',
  Frontend = 'Frontend',
  Backend = 'Backend'
}

let longestPrefix = 0

// helper to convert string to string[]
function convertToStringArray(param: string | string[]): string {
  if (typeof param === 'string') {
    return param
  } else if (Array.isArray(param)) {
    return param.join(' ')
  }
  // if somehow the param is an object and not array or string
  return JSON.stringify(param)
}

const padNumberToTwo = (n: number) => {
  return ('0' + n).slice(-2)
}

const repeatString = (n: number, char: string) => {
  return n > 0 ? char.repeat(n) : ''
}

const getTimeStamp = () => {
  const ts = new Date()

  return `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`
}

const getPrefixString = (prefix: LogPrefix) => {
  return prefix !== LogPrefix.General
    ? `[${prefix}]: ${repeatString(longestPrefix - prefix.length, ' ')}`
    : ''
}

/**
 * Log debug messages
 * @param text debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  const extendText = `${getTimeStamp()} DEBUG:   ${getPrefixString(
    prefix
  )}${convertToStringArray(text)}`
  console.log(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Log error messages
 * @param text error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  const extendText = `${getTimeStamp()} ERROR:   ${getPrefixString(
    prefix
  )}${convertToStringArray(text)}`
  console.error(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Log info messages
 * @param text info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  const extendText = `${getTimeStamp()} INFO:    ${getPrefixString(
    prefix
  )}${convertToStringArray(text)}`
  console.log(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Log warning messages
 * @param text warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  const extendText = `${getTimeStamp()} WARNING: ${getPrefixString(
    prefix
  )}${convertToStringArray(text)}`
  console.warn(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

interface createLogFileReturn {
  currentLogFile: string
  lastLogFile: string
}

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
    logError(
      `Open ${currentLogFile} failed with ${error}`,
      LogPrefix.Backend,
      true
    )
  }

  // Clean out logs that are more than a month old
  try {
    const logs = readdirSync(logDir)
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
    logError(
      `Removing old logs in ${logDir} failed with ${error}`,
      LogPrefix.Backend,
      true
    )
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
 * @param isDefault   getting heroic default log
 * @param appName     needed to get appName log
 * @param defaultLast if set getting heroic default latest log
 * @returns path to log file
 */
export function getLogFile(
  isDefault: boolean,
  appName: string,
  defaultLast = false
): string {
  return isDefault
    ? defaultLast
      ? lastLogFile
      : currentLogFile
    : join(heroicGamesConfigPath, appName + '-lastPlay.log')
}

/**
 * Appends given message to the current log file
 * @param message message to append
 */
function appendMessageToLogFile(message: string) {
  try {
    if (currentLogFile) {
      appendFileSync(currentLogFile, `${message}\n`)
    }
  } catch (error) {
    logError(`Writing log file failed with ${error}`, LogPrefix.Backend, true)
  }
}
