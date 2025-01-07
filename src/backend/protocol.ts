import { dialog } from 'electron'
import { logError, logInfo, LogPrefix } from './logger/logger'
import i18next from 'i18next'
import { getInfo } from './utils'
import { GameInfo, Runner } from 'common/types'
import { getMainWindow, sendFrontendMessage } from './main_window'
import { icon } from './constants'
import { gameManagerMap } from './storeManagers'
import { launchEventCallback } from './launcher'

type Command = 'ping' | 'launch'
type EGLCommand = 'store' | 'apps'

const RUNNERS = ['legendary', 'gog', 'nile', 'sideload']

/**
 * Handles a protocol request
 * @param args The args to search
 * @example
 * handleProtocol(['heroic://ping'])
 * // => 'Received ping! Arg: undefined'
 * handleProtocol(['heroic://launch/gog/123'])
 * // => 'Received launch! Runner: gog, Arg: 123'
 **/
export async function handleProtocol(args: string[]) {
  const mainWindow = getMainWindow()

  const url = getUrl(args)
  if (!url) {
    return
  }

  const [command, runner, arg = ''] = parseUrl(url)

  logInfo(`received '${url}'`, LogPrefix.ProtocolHandler)

  switch (command) {
    case 'ping':
      return handlePing(arg)
    case 'launch':
      await handleLaunch(runner, arg, mainWindow)
      break
    default:
      return
  }
}

export async function handleEGLProtocol(args: string[]) {
  const mainWindow = getMainWindow()

  const url = getEGLUrl(args)
  if (!url) {
    return
  }

  const [command, arg] = parseEGLUrl(decodeURIComponent(url))
  const decoded = (arg || '').split('?')
  const decoded_data = decoded[0]
  const ids = decoded_data.match(/^([^:]+):([^:]+):([^:]+)$/)

  switch (command) {
    case 'store':
      logInfo(`opening store ${arg}`, LogPrefix.ProtocolHandler)
      if (arg === 'library') sendFrontendMessage('openScreen', '/library')
      else
        sendFrontendMessage(
          'openScreen',
          `/store-page?store-url=${'https://www.epicgames.com/store/' + arg}`
        )
      break
    case 'apps':
      logInfo(`opening app ${decoded.join('?')}`, LogPrefix.ProtocolHandler)
      if (ids) {
        //ID based path
        logInfo(`Launching ID ${ids[3]}`, LogPrefix.ProtocolHandler)
        handleLaunch('legendary', ids[3], mainWindow)
      } else {
        //Windows Path
      }
      break
    default:
      logInfo(
        `received unknown EGL command ${command}`,
        LogPrefix.ProtocolHandler
      )
      return
  }

  return
}

/**
 * Gets the url from the args
 * @param args The args to search
 * @returns The url if found, undefined otherwise
 * @example
 * getUrl(['heroic://ping'])
 * // => 'heroic://ping'
 * getUrl(['heroic://launch/gog/123'])
 * // => 'heroic://launch/gog/123'
 * getUrl(['heroic://launch/legendary/123'])
 * // => 'heroic://launch/legendary/123'
 **/
function getUrl(args: string[]): string | undefined {
  return args.find((arg) => arg.startsWith('heroic://'))
}

/**
 * Gets the url from the args
 * @param args The args to search
 * @returns The url if found, undefined otherwise
 **/
function getEGLUrl(args: string[]): string | undefined {
  return args.find((arg) => arg.startsWith('com.epicgames.launcher://'))
}

/**
 * Parses a url into a tuple of [Command, Runner?, string?]
 * @param url The url to parse
 * @returns A tuple of [Command, Runner?, string?]
 * @example
 * parseUrl('heroic://ping')
 * // => ['ping', undefined, undefined]
 * parseUrl('heroic://launch/gog/123')
 * // => ['launch', 'gog', '123']
 * parseUrl('heroic://launch/123')
 * // => ['launch', '123']
 **/
function parseUrl(url: string): [Command, Runner?, string?] {
  const [, fullCommand] = url.split('://')

  //check if the second param is a runner or not and adjust parts accordingly
  const hasRunner = RUNNERS.includes(fullCommand.split('/')[1] as Runner)
  if (hasRunner) {
    const [command, runner, arg] = fullCommand.split('/')
    return [command as Command, runner as Runner, arg]
  } else {
    const [command, arg] = fullCommand.split('/')
    return [command as Command, undefined, arg]
  }
}

function parseEGLUrl(url: string): [EGLCommand, string?] {
  const [, fullCommand] = url.split('://')

  const index = fullCommand.indexOf('/')

  if (index === -1) {
    return [fullCommand as EGLCommand]
  }

  return [
    fullCommand.substring(0, index) as EGLCommand,
    fullCommand.substring(index + 1)
  ]
}

async function handlePing(arg: string) {
  return logInfo(['Received ping! Arg:', arg], LogPrefix.ProtocolHandler)
}

/**
 * Handles a launch command
 * @param runner The runner to launch the game with
 * @param arg The game to launch
 * @param mainWindow The main window
 * @example
 * handleLaunch('gog', '123')
 * // => 'Received launch! Runner: gog, Arg: 123'
 * handleLaunch('legendary', '123')
 * // => 'Received launch! Runner: legendary, Arg: 123'
 * handleLaunch('nile', '123')
 * // => 'Received launch! Runner: nile, Arg: 123'
 **/
async function handleLaunch(
  runner: Runner | undefined,
  arg: string | undefined,
  mainWindow?: Electron.BrowserWindow | null
) {
  const game = await findGame(runner, arg)

  if (!game) {
    return logError(
      `Could not receive game data for ${arg}!`,
      LogPrefix.ProtocolHandler
    )
  }

  const { is_installed, title, app_name, runner: gameRunner } = game
  const settings = await gameManagerMap[gameRunner].getSettings(app_name)

  if (!is_installed) {
    logInfo(`"${title}" not installed.`, LogPrefix.ProtocolHandler)

    if (!mainWindow) {
      return
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      buttons: [i18next.t('box.yes'), i18next.t('box.no')],
      cancelId: 1,
      message: `${title} ${i18next.t(
        'box.protocol.install.not_installed',
        'Is Not Installed, do you wish to Install it?'
      )}`,
      title: title,
      icon: icon
    })
    if (response === 0) {
      return sendFrontendMessage('installGame', app_name, gameRunner)
    }
    if (response === 1) {
      return logInfo('Not installing game', LogPrefix.ProtocolHandler)
    }
  }

  mainWindow?.hide()
  launchEventCallback({
    appName: app_name,
    runner: gameRunner,
    skipVersionCheck: settings.ignoreGameUpdates
  })
}

/**
 * Finds a game in the runners specified in runnersToSearch
 * @param runner The runner to search for the game
 * @param arg The game to search
 * @returns The game info if found, null otherwise
 * @example
 * findGame('gog', '123')
 * // => { app_name: '123', title: '123', is_installed: true, runner: 'gog' ...}
 * findGame('legendary', '123')
 * // => { app_name: '123', title: '123', is_installed: true, runner: 'legendary' ...}
 * findGame('nile', '123')
 * // => { app_name: '123', title: '123', is_installed: true, runner: 'nile' ...}
 **/
async function findGame(
  runner: Runner | undefined,
  arg = ''
): Promise<GameInfo | null> {
  if (!arg) {
    return null
  }

  // If a runner is specified, search for the game in that runner and return it (if found)
  if (runner) {
    const gameInfo = getInfo(arg, runner)
    if (gameInfo.app_name) {
      return gameInfo
    }
  }

  // If no runner is specified, search for the game in all runners and return the first one found
  for (const currentRunner of RUNNERS) {
    const run = (currentRunner as Runner) || 'legendary'

    const gameInfoOrSideload = getInfo(arg, run)
    if (gameInfoOrSideload.app_name) {
      return gameInfoOrSideload
    }
  }
  return null
}
