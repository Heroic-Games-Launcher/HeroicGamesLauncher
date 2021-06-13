/**
 * Use this module to log things into the console.
 * Everything will be saved to a file before the app exits.
 * Note that with console.log and console.warn everything will be saved too.
 * error equals console.error
 */


export function debug(...text: string[] | String[]) {
  console.log(`DEBUG: ${text.join(' ')}`)
}


export const error = console.error;

export function info(...text: string[] | String[]) {
  console.log(`INFO: ${text.join(' ')}`)
}

export function warning(...text: string[] | String[]) {
  console.log(`WARNING: ${text.join(' ')}`)
}
