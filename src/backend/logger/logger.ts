/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import { AppSettings, GameSettings } from 'common/types'
import { showDialogBoxModalAuto } from '../dialog/dialog'
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
  Shortcuts = 'Shortcuts',
  WineTricks = 'Winetricks',
  Connection = 'Connection',
  DownloadManager = 'DownloadManager',
  ExtraGameInfo = 'ExtraGameInfo'
}

type LogInputType = unknown[] | unknown

interface LogOptions {
  prefix?: LogPrefix
  showDialog?: boolean
  skipLogToFile?: boolean
}

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
          return value!['stack'] ? value!['stack'] : value!.toString()
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

  const strings: string[] = []
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

const getLogLevelString = (level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR') => {
  return `${level}:${repeatString(7 - level.length, ' ')}`
}

const getPrefixString = (prefix: LogPrefix) => {
  return prefix !== LogPrefix.General
    ? `[${prefix}]: ${repeatString(getLongestPrefix() - prefix.length, ' ')}`
    : ''
}

function logBase(
  input: LogInputType,
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR',
  options_or_prefix?: LogOptions | LogPrefix
) {
  let options
  if (typeof options_or_prefix === 'string') {
    options = { prefix: options_or_prefix }
  } else {
    options = options_or_prefix
  }

  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} ${getLogLevelString(
    level
  )} ${getPrefixString(options?.prefix ?? LogPrefix.Backend)}`

  switch (level) {
    case 'ERROR':
      console.error(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
    case 'WARNING':
      console.warn(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
    case 'INFO':
    case 'DEBUG':
    default:
      console.log(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
  }

  if (options?.showDialog) {
    showDialogBoxModalAuto({
      title: options?.prefix ?? LogPrefix.Backend,
      message: text,
      type: 'ERROR'
    })
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}

/**
 * Log debug messages
 * @param input debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(input: LogInputType, options?: LogOptions): void
export function logDebug(input: LogInputType, prefix?: LogPrefix): void
export function logDebug(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'DEBUG', options_or_prefix)
}

/**
 * Log error messages
 * @param input error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(input: LogInputType, options?: LogOptions): void
export function logError(input: LogInputType, prefix?: LogPrefix): void
export function logError(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'ERROR', options_or_prefix)
}

/**
 * Log info messages
 * @param input info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(input: LogInputType, options?: LogOptions): void
export function logInfo(input: LogInputType, prefix?: LogPrefix): void
export function logInfo(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'INFO', options_or_prefix)
}

/**
 * Log warning messages
 * @param input warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(input: LogInputType, options?: LogOptions): void
export function logWarning(input: LogInputType, prefix?: LogPrefix): void
export function logWarning(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'WARNING', options_or_prefix)
}

export function logChangedSetting(
  config: Partial<AppSettings>,
  oldConfig: GameSettings
) {
  const changedSettings = Object.keys(config).filter(
    (key) => config[key] !== oldConfig[key]
  )

  changedSettings.forEach((changedSetting) => {
    // check if both are empty arrays
    if (
      Array.isArray(config[changedSetting]) &&
      Array.isArray(oldConfig[changedSetting]) &&
      config[changedSetting].length === 0 &&
      oldConfig[changedSetting].length === 0
    ) {
      return
    }

    // check if both are objects and have different values
    if (
      typeof config[changedSetting] === 'object' &&
      typeof oldConfig[changedSetting] === 'object' &&
      JSON.stringify(config[changedSetting]) ===
        JSON.stringify(oldConfig[changedSetting])
    ) {
      return
    }

    const oldSetting =
      typeof oldConfig[changedSetting] === 'object'
        ? JSON.stringify(oldConfig[changedSetting])
        : oldConfig[changedSetting]
    const newSetting =
      typeof config[changedSetting] === 'object'
        ? JSON.stringify(config[changedSetting])
        : config[changedSetting]

    logInfo(
      `Changed config: ${changedSetting} from ${oldSetting} to ${newSetting}`,
      LogPrefix.Backend
    )
  })
}
