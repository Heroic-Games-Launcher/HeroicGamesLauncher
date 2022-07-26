import { spawn } from 'child_process'
import { logDebug, LogPrefix } from '../logger/logger'
import { isFlatpak } from '../constants'
import shlex from 'shlex'

function prepareBottlesCommand(
  args: string[],
  bottlesBin: string,
  noCli?: boolean,
  join?: boolean
): string[] | string {
  const command: string[] = []

  if (isFlatpak) {
    command.push(...['flatpak-spawn', '--host'])
  }

  if (bottlesBin === 'flatpak') {
    command.push(...['flatpak', 'run'])
    if (!noCli) {
      command.push('--command=bottles-cli')
    }
    command.push('com.usebottles.bottles')
  } else {
    command.push('bottles-cli')
  }

  command.push(...args)
  if (join) {
    return shlex.join(command)
  }
  return command
}

async function getBottlesNames(
  bottlesBin: 'flatpak' | 'os'
): Promise<string[]> {
  // Prepare command
  const { stdout } = await runBottlesCommand(
    ['--json', 'list', 'bottles'],
    bottlesBin
  )

  const jsonStart = stdout.indexOf('{')
  const parsedData = JSON.parse(stdout.trim().slice(jsonStart))
  return Object.keys(parsedData)
}

async function runBottlesCommand(
  command: string[],
  bottlesType: string,
  noCli?: boolean
): Promise<{ stdout: string; stderr: string; error: boolean }> {
  const [exe, ...bottlesCommand] = prepareBottlesCommand(
    command,
    bottlesType,
    noCli
  ) as string
  logDebug(
    ['Launching bottles command', exe, bottlesCommand.join(' ')],
    LogPrefix.Backend
  )
  const process = spawn(exe, bottlesCommand)

  let stdout = ''
  let stderr = ''

  return new Promise((res) => {
    process.stdout.addListener('data', (data) => {
      if (data) {
        stdout += data.toString()
      }
    })
    process.stderr.addListener('data', (data) => {
      if (data) {
        stderr += data.toString()
      }
    })
    process.addListener('error', () => {
      res({
        stdout,
        stderr,
        error: true
      })
    })
    process.addListener('close', (code) => {
      res({
        stdout,
        stderr,
        error: code !== 0
      })
    })
  })
}

async function openBottles(bottle: string, bottlesType: string) {
  const [exe, ...args] = prepareBottlesCommand(
    ['-b', bottle],
    bottlesType,
    true,
    false
  )
  logDebug(['Opening Bottles', exe, args.join(' ')], LogPrefix.Backend)
  spawn(exe, args)
}

export {
  getBottlesNames,
  prepareBottlesCommand,
  runBottlesCommand,
  openBottles
}
