import { exec, spawn, SpawnOptions } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const spawnAsync = async (
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ code: number | null; stdout: string; stderr: string } | Error> => {
  const child = spawn(command, args, options)
  const stdout: string[] = []
  const stderr: string[] = []

  if (child.stdout) {
    child.stdout.on('data', (data) => stdout.push(data.toString()))
  }

  if (child.stderr) {
    child.stderr.on('data', (data) => stderr.push(data.toString()))
  }

  return new Promise((resolve, reject) => {
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.join(''),
        stderr: stderr.join('')
      })
    })
  })
}

export { execAsync, wait, spawnAsync }
