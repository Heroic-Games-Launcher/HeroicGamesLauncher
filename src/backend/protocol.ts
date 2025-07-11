import { dialog, app } from 'electron'
import { logError, logInfo, LogPrefix } from './logger'
import i18next from 'i18next'
import { GameInfo, LaunchOption, Runner } from 'common/types'
import { getMainWindow } from './main_window'
import { sendFrontendMessage } from './ipc'
import { gameManagerMap } from './storeManagers'
import { launchEventCallback } from './launcher'
import { z } from 'zod'
import { windowIcon } from './constants/paths'
import { Path } from './schemas'
import { isCLINoGui } from './constants/environment'

const RUNNERS = z.enum(['legendary', 'gog', 'nile', 'sideload'])

export function handleProtocol(args: string[]) {
  const urlStr = args.find((arg) => arg.startsWith('heroic://'))
  if (!urlStr) return

  const url = new URL(urlStr)

  logInfo(['Received', url.href], LogPrefix.ProtocolHandler)

  switch (url.hostname) {
    case 'ping':
      return handlePing(url)
    case 'launch':
      return handleLaunch(url)
    default:
      return
  }
}

function handlePing(url: URL) {
  logInfo(['Received ping! Args:', url.searchParams], LogPrefix.ProtocolHandler)
}

async function handleLaunch(url: URL) {
  let appName
  let runnerStr
  let args: string[] = []
  let altExe: Path | undefined = undefined

  // Windows automatically adds a trailing / to shortcuts
  if (url.pathname && url.pathname !== '/') {
    // Old-style pathname URLs:
    // - `heroic://launch/Quail`
    // - `heroic://launch/legendary/Quail`
    const splitPath = url.pathname.split('/').filter(Boolean)
    appName = splitPath.pop()
    runnerStr = splitPath.pop()
  } else {
    // New-style params URL:
    // `heroic://launch?appName=Quail&runner=legendary&arg=foo&arg=bar`
    appName = url.searchParams.get('appName')
    runnerStr = url.searchParams.get('runner')
    args = url.searchParams.getAll('arg')
    const altExeParse = Path.safeParse(url.searchParams.get('altExe'))
    if (altExeParse.success) altExe = altExeParse.data
  }

  if (!appName) {
    logError('No appName in protocol URL', LogPrefix.ProtocolHandler)
    return
  }

  let runner: Runner | undefined
  const runnerParse = RUNNERS.safeParse(runnerStr)
  if (runnerParse.success) {
    runner = runnerParse.data
  }
  const gameInfo = findGame(appName, runner)
  if (!gameInfo) {
    return logError(
      `Could not receive game data for ${appName}!`,
      LogPrefix.ProtocolHandler
    )
  }

  const { is_installed, title } = gameInfo
  const settings = await gameManagerMap[gameInfo.runner].getSettings(appName)

  if (is_installed) {
    let launchOption: LaunchOption | undefined = undefined
    if (altExe)
      launchOption = {
        type: 'altExe',
        executable: altExe
      }

    return launchEventCallback({
      appName: appName,
      runner: gameInfo.runner,
      skipVersionCheck: settings.ignoreGameUpdates,
      args,
      launchArguments: launchOption
    })
  }

  logInfo(`"${title}" not installed.`, LogPrefix.ProtocolHandler)

  const mainWindow = getMainWindow()
  if (!mainWindow) return

  const { response } = await dialog.showMessageBox(mainWindow, {
    buttons: [i18next.t('box.yes'), i18next.t('box.no')],
    cancelId: 1,
    message: `${title} ${i18next.t(
      'box.protocol.install.not_installed',
      'Is Not Installed, do you wish to Install it?'
    )}`,
    title: title,
    icon: windowIcon
  })
  if (response === 0) {
    if (isCLINoGui) {
      logInfo(
        '--no-gui flag detected but user wants to install, showing GUI',
        LogPrefix.ProtocolHandler
      )
      mainWindow.show()
    }
    sendFrontendMessage('installGame', appName, gameInfo.runner)
  } else if (response === 1) {
    logInfo('Not installing game', LogPrefix.ProtocolHandler)
    if (isCLINoGui) {
      logInfo('--no-gui flag detected, exiting app', LogPrefix.ProtocolHandler)
      app.quit()
    }
  }
}

function findGame(
  appName?: string | null,
  runner?: Runner
): GameInfo | undefined {
  if (!appName) return

  // If a runner is specified, search for the game in that runner and return it (if found)
  if (runner) return gameManagerMap[runner].getGameInfo(appName)

  // If no runner is specified, search for the game in all runners and return the first one found
  for (const runner of RUNNERS.options) {
    const maybeGameInfo = gameManagerMap[runner].getGameInfo(appName)
    if (maybeGameInfo.app_name) return maybeGameInfo
  }
  return
}
