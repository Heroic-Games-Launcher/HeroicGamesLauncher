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
