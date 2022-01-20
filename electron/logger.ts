/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import {
  openSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  appendFileSync
} from 'graceful-fs'
import { currentLogFile, heroicLogFolder } from './constants'

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

// helper to convert string to string[]
function convertToStringArray(param: string | string[]): string[] {
  return typeof param === 'string' ? [param] : param
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
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  const extendText = `DEBUG: ${prefixString}${convertToStringArray(text).join(
    ' '
  )}`
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
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  const extendText = `ERROR: ${prefixString}${convertToStringArray(text).join(
    ' '
  )}`
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
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  const extendText = `INFO: ${prefixString}${convertToStringArray(text).join(
    ' '
  )}`
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
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  const extendText = `WARNING: ${prefixString}${convertToStringArray(text).join(
    ' '
  )}`
  console.warn(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Creates a new log file in heroic config path under folder Logs.
 * It also removes old logs every new month.
 * @returns path to current log file
 */
export function createNewLogFileAndClearOldOnces(): string {
  const date = new Date()
  const newLogFile = `${heroicLogFolder}/heroic-${date.toISOString()}.log`
  try {
    if (!existsSync(heroicLogFolder)) {
      mkdirSync(heroicLogFolder)
    }
    openSync(newLogFile, 'w')
  } catch (error) {
    logError(
      `Open ${currentLogFile} failed with ${error}`,
      LogPrefix.Backend,
      true
    )
  }

  try {
    const logs = readdirSync(heroicLogFolder)
    logs.forEach((log) => {
      const dateString = log.replace('heroic-', '').replace('.log', '')
      const logDate = new Date(dateString)
      if (
        logDate.getFullYear() < date.getFullYear() ||
        logDate.getMonth() < date.getMonth()
      ) {
        rmSync(`${heroicLogFolder}/${log}`)
      }
    })
  } catch (error) {
    logError(
      `Removing old logs in ${heroicLogFolder} failed with ${error}`,
      LogPrefix.Backend,
      true
    )
  }

  return newLogFile
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
