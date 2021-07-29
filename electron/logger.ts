/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */

/**
 * Listens to stdout and stderr and saves the messages into the RAM.
 * When the process is about to halt, it resolves the promise and lets you
 * do anything with the logs. In the current implementation, it saves the logs to a
 * file in .config/heroic/Crash Dumps, with this format: {current local time}.txt
 * @returns Promise<string[]>
 */
export function listenStdout(): Promise<string[]> {
  const promise: Promise<string[]> = new Promise((resolve, reject) => {
    const stdout = process.stdout;
    const stderr = process.stderr;

    let logs: Array<string> = []

    stdout.on('data', (data) => {
      if (data === null) reject(new Error('data === null is true'))
      logs = [...logs, data]
    })
    stderr.on('data', (data) => {
      if (data === null) reject(new Error('data === null is true'))
      logs = [...logs, data]
    })

    process.on('beforeExit', () => {
      resolve(logs)
    })
  })
  return promise
}

/**
 * Log debug messages
 * @param text debug messages to log
 */
export function logDebug(...text: string[]) {
  console.log(`DEBUG: ${text.join(' ')}`)
}

/**
 * Log error messages
 * @param text error messages to log
 */
export function logError(...text: string[]) {
  console.error(`ERROR: ${text.join(' ')}`);
}

/**
 * Log info messages
 * @param text info messages to log
 */
export function logInfo(...text: string[]) {
  console.log(`INFO: ${text.join(' ')}`)
}

/**
 * Log warning messages
 * @param text warning messages to log
 */
export function logWarning(...text: string[]) {
  console.log(`WARNING: ${text.join(' ')}`)
}
