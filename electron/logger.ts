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
      logs += data
    })
    stderr.on('data', (data) => {
      if (data === null) reject(new Error('data === null is true'))
      logs += data
    })

    process.on('beforeExit', () => {
      resolve(logs)
    })
  })
  return promise
}
