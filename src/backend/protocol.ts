import { dialog } from 'electron'
import { logError, logInfo, LogPrefix } from './logger/logger'
import i18next from 'i18next'
import { getInfo } from './utils'
import { GameInfo, Runner } from 'common/types'
import { getMainWindow, sendFrontendMessage } from './main_window'
import { icon } from './constants'
import { getGameInfo } from 'backend/storeManagers/hyperplay/games'
import { addGameToLibrary } from 'backend/storeManagers/hyperplay/library'

type Command = 'ping' | 'launch'

const RUNNERS = ['hyperplay', 'legendary', 'gog', 'sideload']

export async function handleProtocol(args: string[]) {
  const mainWindow = getMainWindow()

  // Figure out which argv element is our protocol
  let url = ''
  args.forEach((val) => {
    if (val.startsWith('heroic://')) {
      url = val
    }
  })

  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  let [command, arg] = path.split('/')
  if (!command || !arg) {
    command = path
    arg = ''
  }

  logInfo(`received '${url}'`, LogPrefix.ProtocolHandler)

  if (command === 'ping') {
    return logInfo(['Received ping! Arg:', arg], LogPrefix.ProtocolHandler)
  }

  if (command === 'launch') {
    const runners: Runner[] = ['legendary', 'gog', 'sideload']

    const game = runners
      .map((runner) => getInfo(arg, runner))
      .filter(({ app_name }) => app_name)
      .shift()

    if (!game) {
      return logError(
        `Could not receive game data for ${arg}!`,
        LogPrefix.ProtocolHandler
      )
    }

    const { is_installed, title, app_name, runner } = game
    if (!is_installed) {
      logInfo(`"${arg}" not installed.`, LogPrefix.ProtocolHandler)

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
        title: title
      })
      if (response === 0) {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          buttonLabel: i18next.t('box.choose'),
          properties: ['openDirectory'],
          title: i18next.t('install.path', 'Select Install Path')
        })
        if (canceled) {
          return
        }
        if (filePaths[0]) {
          return sendFrontendMessage('installGame', {
            appName: app_name,
            runner,
            path: filePaths[0]
          })
        }
      }
      if (response === 1) {
        return logInfo('Not installing game', LogPrefix.ProtocolHandler)
      }
    }

  mainWindow?.hide()
  sendFrontendMessage('launchGame', arg, gameRunner)
}

async function findGame(
  runner: Runner | undefined,
  arg: string | undefined = ''
): Promise<GameInfo | null> {
  // If the runner is specified, only search for that runner
  const runnersToSearch = runner ? [runner, 'hyperplay'] : RUNNERS

  // Search for the game in the runners specified in runnersToSearch and return the first one found (if any)
  for (const currentRunner of runnersToSearch) {
    const run = (currentRunner as Runner) || 'hyperplay'
    // handle hp games that are not on the library

    if (run === 'hyperplay') {
      try {
        getGameInfo(arg)
      } catch (error) {
        logInfo(
          `Game ${arg} not found in library. Adding it...`,
          LogPrefix.HyperPlay
        )
        await addGameToLibrary(arg)
        return getGameInfo(arg)
      }
    }

    const gameInfoOrSideload = getInfo(arg, run)
    if (gameInfoOrSideload.app_name) {
      return gameInfoOrSideload
    }
  }
}
