import { dialog, app } from 'electron'
import { logError, logInfo, LogPrefix } from './logger'
import i18next from 'i18next'
import {
  DMQueueElement,
  GameInfo,
  InstallArgs,
  InstallPlatform,
  LaunchOption,
  Runner
} from 'common/types'
import { getMainWindow } from './main_window'
import { sendFrontendMessage } from './ipc'
import { gameManagerMap } from './storeManagers'
import { launchEventCallback } from './launcher'
import { z } from 'zod'
import { windowIcon } from './constants/paths'
import { Path } from './schemas'
import { isCLINoGui } from './constants/environment'
import { addToQueue } from './downloadmanager/downloadqueue'
import { GlobalConfig } from './config'
import { uninstallGameCallback } from './utils/uninstaller'
import { notify } from './dialog/dialog'

const RUNNERS = z.enum(['legendary', 'gog', 'nile', 'sideload'])
const PROTOCOL_ACTIONS = z.enum([
  'ping',
  'launch',
  'install',
  'uninstall',
  'repair',
  'verify',
  'status'
])

type ProtocolAction = z.infer<typeof PROTOCOL_ACTIONS>

type ProtocolRequest = {
  action: ProtocolAction
  appName?: string
  runner?: Runner
  args: string[]
  altExe?: Path
  install: Partial<InstallArgs>
  rawUrl: URL
}

export function handleProtocol(args: string[]) {
  const urlStr = args.find((arg) => arg.startsWith('heroic://'))
  if (!urlStr) return

  const url = new URL(urlStr)

  logInfo(['Received', url.href], LogPrefix.ProtocolHandler)

  const request = parseProtocolRequest(url)
  if (!request) return

  return dispatchProtocolRequest(request)
}

function parseProtocolRequest(url: URL): ProtocolRequest | undefined {
  const actionParse = PROTOCOL_ACTIONS.safeParse(url.hostname)
  if (!actionParse.success) {
    logError(`Unsupported protocol action: ${url.hostname}`, LogPrefix.ProtocolHandler)
    return
  }

  let appName: string | null | undefined
  let runnerStr: string | null | undefined
  let args: string[] = []
  let altExe: Path | undefined
  const install: Partial<InstallArgs> = {}

  // Windows automatically adds a trailing / to shortcuts
  if (url.pathname && url.pathname !== '/') {
    const splitPath = url.pathname.split('/').filter(Boolean)
    appName = splitPath.pop()
    runnerStr = splitPath.pop()
  }

  if (!appName) {
    appName = url.searchParams.get('appName')
  }

  if (!runnerStr) {
    runnerStr = url.searchParams.get('runner')
  }

  args = url.searchParams.getAll('arg').map(decodeURIComponent)

  const altExeParameter = url.searchParams.get('altExe')
  if (altExeParameter) {
    const altExeParse = Path.safeParse(decodeURIComponent(altExeParameter))
    if (altExeParse.success) altExe = altExeParse.data
  }

  const pathParameter = url.searchParams.get('path')
  if (pathParameter) {
    const pathParse = Path.safeParse(decodeURIComponent(pathParameter))
    if (pathParse.success) install.path = pathParse.data
  }

  const platformParameter = url.searchParams.get('platform')
  if (platformParameter) {
    install.platformToInstall = platformParameter as InstallPlatform
  }

  const installLanguage = url.searchParams.get('installLanguage')
  if (installLanguage) install.installLanguage = installLanguage

  const build = url.searchParams.get('build')
  if (build) install.build = build

  const branch = url.searchParams.get('branch')
  if (branch) install.branch = branch

  const installDlcs = url.searchParams.getAll('dlc').map(decodeURIComponent)
  if (installDlcs.length) install.installDlcs = installDlcs

  const sdlList = url.searchParams.getAll('sdl').map(decodeURIComponent)
  if (sdlList.length) install.sdlList = sdlList

  let runner: Runner | undefined
  const runnerParse = RUNNERS.safeParse(runnerStr)
  if (runnerParse.success) {
    runner = runnerParse.data
  }

  return {
    action: actionParse.data,
    appName: appName || undefined,
    runner,
    args,
    altExe,
    install,
    rawUrl: url
  }
}

function dispatchProtocolRequest(request: ProtocolRequest) {
  switch (request.action) {
    case 'ping':
      return handlePing(request.rawUrl)
    case 'launch':
      return handleLaunch(request)
    case 'install':
      return handleInstall(request)
    case 'uninstall':
      return handleUninstall(request)
    case 'repair':
    case 'verify':
      return handleRepair(request)
    case 'status':
      return handleStatus(request)
    default:
      return
  }
}

function handlePing(url: URL) {
  logInfo(['Received ping! Args:', url.searchParams], LogPrefix.ProtocolHandler)
}

async function handleLaunch({ appName, runner, args, altExe }: ProtocolRequest) {
  if (!appName) {
    logError('No appName in protocol URL', LogPrefix.ProtocolHandler)
    return
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

  return promptToInstall(appName, gameInfo.runner, title)
}

async function handleInstall(request: ProtocolRequest) {
  const { appName, runner, install } = request
  if (!appName) {
    logError('No appName in protocol URL', LogPrefix.ProtocolHandler)
    return
  }

  const gameInfo = findGame(appName, runner)
  if (!gameInfo) {
    return logError(
      `Could not receive game data for ${appName}!`,
      LogPrefix.ProtocolHandler
    )
  }

  if (gameInfo.is_installed) {
    logInfo(`"${gameInfo.title}" is already installed.`, LogPrefix.ProtocolHandler)
    notify({
      title: gameInfo.title,
      body: i18next.t('notify.install.finished', 'Installation Finished')
    })
    return
  }

  const installArgs = buildInstallArgs(gameInfo, install)
  if (!installArgs) {
    return promptToInstall(appName, gameInfo.runner, gameInfo.title)
  }

  const queueElement: DMQueueElement = {
    type: 'install',
    params: {
      appName,
      gameInfo,
      runner: gameInfo.runner,
      ...installArgs
    },
    addToQueueTime: Date.now(),
    startTime: 0,
    endTime: 0
  }

  await addToQueue(queueElement)
}

async function handleUninstall(request: ProtocolRequest) {
  const gameInfo = requireInstalledGame(request)
  if (!gameInfo) return

  await uninstallGameCallback(
    {} as never,
    gameInfo.app_name,
    gameInfo.runner,
    false,
    false
  )
}

async function handleRepair(request: ProtocolRequest) {
  const gameInfo = requireInstalledGame(request)
  if (!gameInfo) return

  try {
    await gameManagerMap[gameInfo.runner].repair(gameInfo.app_name)
  } catch (error) {
    logError(error, LogPrefix.ProtocolHandler)
  }
}

async function handleStatus(request: ProtocolRequest) {
  const { appName, runner } = request
  if (!appName) {
    logError('No appName in protocol URL', LogPrefix.ProtocolHandler)
    return
  }

  const gameInfo = findGame(appName, runner)
  if (!gameInfo) {
    return logError(
      `Could not receive game data for ${appName}!`,
      LogPrefix.ProtocolHandler
    )
  }

  const mainWindow = getMainWindow()
  const message = [
    `Runner: ${gameInfo.runner}`,
    `App Name: ${gameInfo.app_name}`,
    `Title: ${gameInfo.title}`,
    `Installed: ${gameInfo.is_installed ? 'Yes' : 'No'}`,
    `Install Path: ${gameInfo.install.install_path || 'N/A'}`
  ].join('\n')

  if (!mainWindow) {
    logInfo(message, LogPrefix.ProtocolHandler)
    return
  }

  await dialog.showMessageBox(mainWindow, {
    buttons: [i18next.t('box.ok', 'OK')],
    message,
    title: i18next.t('box.protocol.status.title', 'Heroic Protocol Status'),
    icon: windowIcon
  })
}

async function promptToInstall(appName: string, runner: Runner, title: string) {
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
    sendFrontendMessage('installGame', appName, runner)
  } else if (response === 1) {
    logInfo('Not installing game', LogPrefix.ProtocolHandler)
    if (isCLINoGui) {
      logInfo('--no-gui flag detected, exiting app', LogPrefix.ProtocolHandler)
      app.quit()
    }
  }
}

function buildInstallArgs(
  gameInfo: GameInfo,
  install: Partial<InstallArgs>
): InstallArgs | undefined {
  const path = install.path || GlobalConfig.get().getSettings().defaultInstallPath
  const platformToInstall =
    install.platformToInstall ||
    gameInfo.install.platform ||
    getDefaultInstallPlatform(gameInfo.runner)

  if (!path || !platformToInstall) {
    return
  }

  return {
    path,
    platformToInstall,
    installDlcs: install.installDlcs,
    sdlList: install.sdlList,
    installLanguage: install.installLanguage,
    branch: install.branch,
    build: install.build,
    dependencies: install.dependencies
  }
}

function getDefaultInstallPlatform(runner: Runner): InstallPlatform | undefined {
  switch (runner) {
    case 'legendary':
      return 'Windows'
    case 'gog':
      return 'windows'
    case 'nile':
      return 'windows'
    default:
      return
  }
}

function requireInstalledGame(request: ProtocolRequest): GameInfo | undefined {
  const { appName, runner } = request
  if (!appName) {
    logError('No appName in protocol URL', LogPrefix.ProtocolHandler)
    return
  }

  const gameInfo = findGame(appName, runner)
  if (!gameInfo) {
    logError(
      `Could not receive game data for ${appName}!`,
      LogPrefix.ProtocolHandler
    )
    return
  }

  if (!gameInfo.is_installed) {
    logError(`"${gameInfo.title}" is not installed.`, LogPrefix.ProtocolHandler)
    return
  }

  return gameInfo
}

function findGame(
  appName?: string | null,
  runner?: Runner
): GameInfo | undefined {
  if (!appName) return

  // If a runner is specified, search for the game in that runner and return it (if found)
  if (runner) return gameManagerMap[runner].getGameInfo(appName)

  // If no runner is specified, search for the game in all runners and return the first one found
  for (const runner of RUNNERS.options as Runner[]) {
    const maybeGameInfo = gameManagerMap[runner].getGameInfo(appName)
    if (maybeGameInfo.app_name) return maybeGameInfo
  }
  return
}
