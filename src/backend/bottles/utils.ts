import { spawn } from 'child_process'
import { logDebug, LogPrefix } from '../logger/logger'
import { isFlatpak } from '../constants'
import { execAsync, quoteIfNecessary } from '../utils'

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
    return command.map(quoteIfNecessary).join(' ')
  }
  return command
}

async function getBottlesNames(
  bottlesBin: 'flatpak' | 'os'
): Promise<string[]> {
  // Prepare command
  const [executable, ...args] = prepareBottlesCommand(
    ['--json', 'list', 'bottles'],
    bottlesBin
  )

  return new Promise((res) => {
    logDebug(
      ['Spawning Bottles command', executable, ...args],
      LogPrefix.Backend
    )
    const proc = spawn(executable, args)
    let stdout: string

    proc.stdout.on('data', (data: Buffer) => {
      if (data) stdout += data.toString()
    })

    proc.on('close', () => {
      const jsonStart = stdout.indexOf('{')
      const parsedData = JSON.parse(stdout.trim().slice(jsonStart))

      res(Object.keys(parsedData))
    })
  })
}

async function runBottlesCommand(command: string[], bottlesType: string) {
  const bottlesCommand = prepareBottlesCommand(
    command,
    bottlesType,
    false,
    true
  ) as string

  return execAsync(bottlesCommand)
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
