/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */

export enum LogPrefix {
  General = '',
  Legendary = 'Legendary',
  GamePad = 'GamePad',
  WineDownloader = 'WineDownloader',
  Frontend = 'Frontend'
}

// helper to convert string to string[]
function convertToStringArray(param: string | string[]): string[] {
  return typeof param === 'string' ? [param] : param
}

/**
 * Log debug messages
 * @param text debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General
) {
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  console.log(`DEBUG: ${prefixString}${convertToStringArray(text).join(' ')}`)
}

/**
 * Log error messages
 * @param text error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General
) {
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  console.error(`ERROR: ${prefixString}${convertToStringArray(text).join(' ')}`)
}

/**
 * Log info messages
 * @param text info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General
) {
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  console.log(`INFO: ${prefixString}${convertToStringArray(text).join(' ')}`)
}

/**
 * Log warning messages
 * @param text warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General
) {
  const prefixString = prefix !== LogPrefix.General ? `[${prefix}]: ` : ''
  console.warn(
    `WARNING: ${prefixString}${convertToStringArray(text).join(' ')}`
  )
}
