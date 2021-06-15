/**
 * @file  Use this module to log things into the console.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */

/**
 * Log debug messages
 * @param text debug messages to log
 */
export function debug(...text: string[]) {
  console.log(`DEBUG: ${text.join(' ')}`)
}

/**
 * Log error messages
 * @param text error messages to log
 */
export function error(...text: string[]) {
  console.error(`ERROR: ${text.join(' ')}`);
}

/**
 * Log info messages
 * @param text info messages to log
 */
export function info(...text: string[]) {
  console.log(`INFO: ${text.join(' ')}`)
}

/**
 * Log warning messages
 * @param text warning messages to log
 */
export function warning(...text: string[]) {
  console.log(`WARNING: ${text.join(' ')}`)
}
