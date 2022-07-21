/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import { showErrorBoxModalAuto } from '../utils'
import { appendMessageToLogFile, getLongestPrefix } from './logfile'

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
  Backend = 'Backend',
  Runtime = 'Runtime',
  Shortcuts = 'Shortcuts'
}

type LogInputType = unknown[] | unknown

// helper to convert LogInputType to string
function convertInputToString(param: LogInputType): string {
  const getString = (value: LogInputType): string => {
    switch (typeof value) {
      case 'string':
        return value
      case 'object':
        // Object.prototype.toString.call(value).includes('Error') will catch all
        // Error types (Error, EvalError, SyntaxError, ...)
        if (Object.prototype.toString.call(value).includes('Error')) {
          return value.toString()
        } else if (Object.prototype.toString.call(value).includes('Object')) {
          return JSON.stringify(value, null, 2)
        } else {
          return `${value}`
        }
      case 'number':
        return String(value)
      case 'boolean':
        return value ? 'true' : 'false'
      default:
        return `${value}`
    }
  }

  if (!Array.isArray(param)) {
    return getString(param)
  }

  const strings = [] as string[]
  param.forEach((value) => {
    strings.push(getString(value))
  })
  return strings.join(' ')
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
    ? `[${prefix}]: ${repeatString(getLongestPrefix() - prefix.length, ' ')}`
    : ''
}

/**
 * Log debug messages
 * @param input debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(
  input: LogInputType,
  options?: {
    prefix?: LogPrefix
    showDialog?: boolean
    skipLogToFile?: boolean
  }
) {
  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} DEBUG:   ${getPrefixString(
    options?.prefix
  )}`

  console.log(messagePrefix, ...(Array.isArray(input) ? input : [input]))

  if (options?.showDialog) {
    showErrorBoxModalAuto(options?.prefix, text)
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}

/**
 * Log error messages
 * @param input error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(
  input: LogInputType,
  options?: {
    prefix?: LogPrefix
    showDialog?: boolean
    skipLogToFile?: boolean
  }
) {
  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} ERROR:   ${getPrefixString(
    options?.prefix
  )}`

  console.error(messagePrefix, ...(Array.isArray(input) ? input : [input]))

  if (options?.showDialog) {
    showErrorBoxModalAuto(options?.prefix, text)
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}

/**
 * Log info messages
 * @param input info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(
  input: LogInputType,
  options?: {
    prefix?: LogPrefix
    showDialog?: boolean
    skipLogToFile?: boolean
  }
) {
  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} INFO:    ${getPrefixString(
    options?.prefix
  )}`

  console.log(messagePrefix, ...(Array.isArray(input) ? input : [input]))

  if (options?.showDialog) {
    showErrorBoxModalAuto(options?.prefix, text)
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}

/**
 * Log warning messages
 * @param input warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(
  input: LogInputType,
  options?: {
    prefix?: LogPrefix
    showDialog?: boolean
    skipLogToFile?: boolean
  }
) {
  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} WARNING: ${getPrefixString(
    options?.prefix
  )}`

  console.warn(messagePrefix, ...(Array.isArray(input) ? input : [input]))

  if (options?.showDialog) {
    showErrorBoxModalAuto(options?.prefix, text)
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}
