import { Runner } from './types'
import { BrowserWindow } from 'electron'
import { Game } from './games'
import { logError, logInfo, LogPrefix } from './logger/logger'
import { wrappedLaunch } from './launcher'
import shlex from 'shlex'
import { runLegendaryCommand } from './legendary/library'
import { runGogdlCommand } from './gog/library'

function command_ping(args: Record<string, string>) {
  logInfo(
    ['Received ping! Args:', JSON.stringify(args)],
    LogPrefix.ProtocolHandler
  )
}

async function command_launch(
  args: Record<string, string>,
  window: BrowserWindow
) {
  const appName = args.appName ?? ''
  const runner: Runner = (args.runner as Runner) ?? 'legendary'

  const game = Game.get(appName, runner)
  if (!game) {
    logError(['Game', appName, 'was not found in library, cannot launch'])
    return
  }
  const { is_installed, title } = game.getGameInfo()
  if (!is_installed) {
    logError(
      ['Game', title, 'is not installed, cannot launch'],
      LogPrefix.ProtocolHandler
    )
    return
  }

  wrappedLaunch(appName, runner, '', window)
}

async function command_runLegendary(args: Record<string, string>) {
  const commandParts = shlex.split(args.arguments ?? '')
  return runLegendaryCommand(commandParts, {
    onOutput: (output) => console.log(output.trim())
  })
}

async function command_runGogdl(args: Record<string, string>) {
  const commandParts = shlex.split(args.arguments ?? '')
  return runGogdlCommand(commandParts, {
    onOutput: (output) => console.log(output.trim())
  })
}

function parseProtocolString(protocolString: string): {
  command: string
  args: Record<string, string>
} {
  const [scheme, path] = protocolString.split('://')
  if (scheme !== 'heroic' || !path) {
    return { command: '', args: {} }
  }

  let command = ''
  const args: Record<string, string> = {}
  // TEMP: Old-style protocol handling (heroic://launch/AppName)
  // HACK: The only valid protocol with this style is 'launch', but this is still a little hacky
  if (path.startsWith('launch/')) {
    const splitPath = path.split('/')
    command = splitPath.shift()
    args.appName = splitPath.shift()
  } else {
    // Newer-style (heroic://launch?appName=SomeAppName&runner=Runner)
    const splitPath = path.split('?')
    command = splitPath.shift()
    const variables = splitPath.shift().split('&')
    for (const variableNameAndValue of variables) {
      const splitNameAndValue = variableNameAndValue.split('=')
      const name = splitNameAndValue.shift()
      const value = splitNameAndValue.join('=').replaceAll('%20', ' ')
      args[name] = value
    }
  }
  return { command, args }
}

export async function handleProtocol(window: BrowserWindow, args: string[]) {
  // Figure out which argv element is our protocol
  let url = ''
  args.forEach((val) => {
    if (val.startsWith('heroic://')) {
      url = val
    }
  })

  const { command, args: cmd_args } = parseProtocolString(url)
  if (!command) {
    return
  }

  logInfo(`Received '${url}'`, LogPrefix.ProtocolHandler)

  switch (command) {
    case 'ping':
      return command_ping(cmd_args)
    case 'launch':
      return command_launch(cmd_args, window)
    case 'runLegendaryCommand':
      return command_runLegendary(cmd_args)
    case 'runGogdlCommand':
      return command_runGogdl(cmd_args)
    default:
      logError(
        ['Unknown protocol command:', command],
        LogPrefix.ProtocolHandler
      )
  }
}
