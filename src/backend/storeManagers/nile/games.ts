import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
  InstallProgress
} from 'common/types'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import {
  runRunnerCommand as runNileCommand,
  getGameInfo as nileLibraryGetGameInfo,
  changeGameInstallPath,
  installState,
  removeFromInstalledConfig,
  getInstallMetadata
} from './library'
import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logsDisabled
} from 'backend/logger/logger'
import { gamesConfigPath, isWindows } from 'backend/constants'
import { GameConfig } from 'backend/game_config'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import {
  getRunnerCallWithoutCredentials,
  launchCleanup,
  prepareLaunch,
  prepareWineLaunch,
  setupEnvVars,
  setupWrappers
} from 'backend/launcher'
import { appendFileSync, existsSync } from 'graceful-fs'
import { logFileLocation } from 'backend/storeManagers/storeManagerCommon/games'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import { t } from 'i18next'
import { getWineFlags } from 'backend/utils/compatibility_layers'
import shlex from 'shlex'
import { join } from 'path'
import {
  getNileBin,
  killPattern,
  moveOnUnix,
  moveOnWindows,
  shutdownWine
} from 'backend/utils'
import { GlobalConfig } from 'backend/config'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { sendFrontendMessage } from 'backend/main_window'
import setup from './setup'

export async function getSettings(appName: string): Promise<GameSettings> {
  const gameConfig = GameConfig.get(appName)
  return gameConfig.config || (await gameConfig.getSettings())
}

export function getGameInfo(appName: string): GameInfo {
  const info = nileLibraryGetGameInfo(appName)
  if (!info) {
    logError(
      [
        'Could not get game info for',
        `${appName},`,
        'returning empty object. Something is probably gonna go wrong soon'
      ],
      LogPrefix.Nile
    )
    return {
      app_name: '',
      runner: 'nile',
      art_cover: '',
      art_square: '',
      install: {},
      is_installed: false,
      title: '',
      canRunOffline: false
    }
  }
  return info
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const info = nileLibraryGetGameInfo(appName)
  return {
    reqs: [],
    about: info?.description
      ? {
          description: info.description,
          shortDescription: info.description
        }
      : undefined
  }
}

export async function importGame(
  appName: string,
  folderPath: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  platform: InstallPlatform
): Promise<ExecResult> {
  const logPath = join(gamesConfigPath, `${appName}.log`)
  const res = await runNileCommand(
    ['import', '--path', folderPath, appName],
    createAbortController(appName),
    {
      logFile: logPath,
      logMessagePrefix: `Importing ${appName}`
    }
  )
  deleteAbortController(appName)

  if (res.abort) {
    return res
  }

  if (res.error) {
    logError(['Failed to import', `${appName}:`, res.error], LogPrefix.Nile)
    return res
  }

  const errorMatch = res.stderr.match(/ERROR \[IMPORT]:\t(.*)/)
  if (errorMatch) {
    logError(['Failed to import', `${appName}:`, errorMatch[1]], LogPrefix.Nile)
    return {
      ...res,
      error: errorMatch[1]
    }
  }

  try {
    addShortcuts(appName)
    installState(appName, true)
  } catch (error) {
    logError(['Failed to import', `${appName}:`, error], LogPrefix.Nile)
  }

  return res
}

interface tmpProgressMap {
  [key: string]: InstallProgress
}

function defaultTmpProgress() {
  return {
    bytes: '',
    eta: '',
    percent: undefined,
    diskSpeed: undefined,
    downSpeed: undefined
  }
}
const tmpProgress: tmpProgressMap = {}

export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalDownloadSize = -1
) {
  if (!Object.hasOwn(tmpProgress, appName)) {
    tmpProgress[appName] = defaultTmpProgress()
  }
  const progress = tmpProgress[appName]

  // parse log for percent
  if (!progress.percent) {
    const percentMatch = data.match(/Progress: (\d+\.\d+) /m)

    progress.percent = !Number.isNaN(Number(percentMatch?.at(1)))
      ? Number(percentMatch?.at(1))
      : undefined
  }

  // parse log for eta
  if (progress.eta === '') {
    const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
    progress.eta = etaMatch && etaMatch?.length >= 2 ? etaMatch[1] : ''
  }

  // parse log for game download progress
  if (progress.bytes === '') {
    const bytesMatch = data.match(/Downloaded: (\S+) MiB/m)
    progress.bytes =
      bytesMatch && bytesMatch?.length >= 2 ? `${bytesMatch[1]}MB` : ''
  }

  // parse log for download speed
  if (!progress.downSpeed) {
    const downSpeedMBytes = data.match(/Download\t- (\S+.) MiB/m)
    progress.downSpeed = !Number.isNaN(Number(downSpeedMBytes?.at(1)))
      ? Number(downSpeedMBytes?.at(1))
      : undefined
  }

  // parse disk write speed
  if (!progress.diskSpeed) {
    const diskSpeedMBytes = data.match(/Disk\t- (\S+.) MiB/m)
    progress.diskSpeed = !Number.isNaN(Number(diskSpeedMBytes?.at(1)))
      ? Number(diskSpeedMBytes?.at(1))
      : undefined
  }

  // only send to frontend if all values are updated
  if (
    Object.values(progress).every(
      (value) => !(value === undefined || value === '')
    )
  ) {
    logInfo(
      [
        `Progress for ${getGameInfo(appName).title}:`,
        `${progress.percent}%/${progress.bytes}/${progress.eta}`.trim(),
        `Down: ${progress.downSpeed}MB/s / Disk: ${progress.diskSpeed}MB/s`
      ],
      LogPrefix.Nile
    )

    sendFrontendMessage(`progressUpdate-${appName}`, {
      appName,
      runner: 'nile',
      status: action,
      progress
    })

    // reset
    tmpProgress[appName] = defaultTmpProgress()
  }
}

export async function install(
  appName: string,
  { path }: InstallArgs
): Promise<InstallResult> {
  const { maxWorkers } = GlobalConfig.get().getSettings()
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []

  const logPath = join(gamesConfigPath, `${appName}.log`)

  const commandParts = ['install', '--base-path', path, ...workers, appName]

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(appName, 'installing', data)
  }

  const res = await runNileCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Installing ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.abort) {
    return { status: 'abort' }
  }

  if (res.error) {
    if (!res.error.includes('signal')) {
      logError(['Failed to install', appName, res.error], LogPrefix.Nile)
    }
    return { status: 'error', error: res.error }
  }
  addShortcuts(appName)
  installState(appName, true)
  const metadata = getInstallMetadata(appName)

  if (isWindows) {
    await setup(appName, metadata?.path)
  }

  return { status: 'done' }
}

export function isNative(): boolean {
  return isWindows
}

/**
 * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
 * so that the game can be opened from the start menu and the desktop folder.
 * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
 * @async
 * @public
 */
export async function addShortcuts(appName: string, fromMenu?: boolean) {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

/**
 * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
 * @async
 * @public
 */
export async function removeShortcuts(appName: string) {
  return removeShortcutsUtil(getGameInfo(appName))
}

export async function launch(
  appName: string,
  launchArguments?: string
): Promise<boolean> {
  const gameSettings = await getSettings(appName)
  const gameInfo = getGameInfo(appName)

  const {
    success: launchPrepSuccess,
    failureReason: launchPrepFailReason,
    rpcClient,
    mangoHudCommand,
    gameModeBin,
    steamRuntime
  } = await prepareLaunch(gameSettings, gameInfo, isNative())

  if (!launchPrepSuccess) {
    appendFileSync(
      logFileLocation(appName),
      `Launch aborted: ${launchPrepFailReason}`
    )
    showDialogBoxModalAuto({
      title: t('box.error.launchAborted', 'Launch aborted'),
      message: launchPrepFailReason!,
      type: 'ERROR'
    })
    return false
  }
  const exeOverrideFlag = gameSettings.targetExe
    ? ['--override-exe', gameSettings.targetExe]
    : []

  let commandEnv = isWindows
    ? process.env
    : { ...process.env, ...setupEnvVars(gameSettings) }
  let wineFlag: string[] = []

  if (!isNative()) {
    // -> We're using Wine/Proton on Linux or CX on Mac
    const {
      success: wineLaunchPrepSuccess,
      failureReason: wineLaunchPrepFailReason,
      envVars: wineEnvVars
    } = await prepareWineLaunch('nile', appName)
    if (!wineLaunchPrepSuccess) {
      appendFileSync(
        logFileLocation(appName),
        `Launch aborted: ${wineLaunchPrepFailReason}`
      )
      if (wineLaunchPrepFailReason) {
        showDialogBoxModalAuto({
          title: t('box.error.launchAborted', 'Launch aborted'),
          message: wineLaunchPrepFailReason,
          type: 'ERROR'
        })
      }
      return false
    }

    commandEnv = {
      ...commandEnv,
      ...wineEnvVars
    }

    const { bin: wineExec, type: wineType } = gameSettings.wineVersion

    // Fix for people with old config
    const wineBin =
      wineExec.startsWith("'") && wineExec.endsWith("'")
        ? wineExec.replaceAll("'", '')
        : wineExec

    wineFlag = [
      ...getWineFlags(wineBin, gameSettings, wineType),
      '--wine-prefix',
      gameSettings.winePrefix
    ]
  }

  const commandParts = [
    'launch',
    ...exeOverrideFlag, // Check if this works
    ...wineFlag,
    ...shlex.split(launchArguments ?? ''),
    ...shlex.split(gameSettings.launcherArgs ?? ''),
    appName
  ]
  const wrappers = setupWrappers(
    gameSettings,
    mangoHudCommand,
    gameModeBin,
    steamRuntime?.length ? [...steamRuntime] : undefined
  )

  const fullCommand = getRunnerCallWithoutCredentials(
    commandParts,
    commandEnv,
    wrappers,
    join(...Object.values(getNileBin()))
  )
  appendFileSync(
    logFileLocation(appName),
    `Launch Command: ${fullCommand}\n\nGame Log:\n`
  )

  const { error } = await runNileCommand(
    commandParts,
    createAbortController(appName),
    {
      env: commandEnv,
      wrappers,
      logMessagePrefix: `Launching ${gameInfo.title}`,
      onOutput(output) {
        if (!logsDisabled) appendFileSync(logFileLocation(appName), output)
      }
    }
  )

  deleteAbortController(appName)

  if (error) {
    logError(['Error launching game:', error], LogPrefix.Nile)
  }

  launchCleanup(rpcClient)

  return !error
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  const gameInfo = getGameInfo(appName)
  logInfo(`Moving ${gameInfo.title} to ${newInstallPath}`, LogPrefix.Nile)

  const moveImpl = isWindows ? moveOnWindows : moveOnUnix
  const moveResult = await moveImpl(newInstallPath, gameInfo)

  if (moveResult.status === 'error') {
    const { error } = moveResult
    logError(
      ['Error moving', gameInfo.title, 'to', newInstallPath, error],
      LogPrefix.Nile
    )
    return { status: 'error', error }
  }

  await changeGameInstallPath(appName, moveResult.installPath)
  return { status: 'done' }
}

export async function repair(appName: string): Promise<ExecResult> {
  const installInfo = getGameInfo(appName)
  const { install_path } = installInfo.install ?? {}

  if (!install_path) {
    const error = `Could not find install path for ${appName}`
    logError(error, LogPrefix.Nile)
    return {
      stderr: '',
      stdout: '',
      error
    }
  }

  logDebug([appName, 'is installed at', install_path], LogPrefix.Nile)
  const logPath = join(gamesConfigPath, `${appName}.log`)
  const res = await runNileCommand(
    ['verify', '--path', install_path, appName],
    createAbortController(appName),
    {
      logFile: logPath,
      logMessagePrefix: `Repairing ${appName}`
    }
  )
  deleteAbortController(appName)

  if (res.error) {
    logError(['Failed to repair', `${appName}:`, res.error], LogPrefix.Nile)
  }

  return res
}

export async function syncSaves(): Promise<string> {
  // Amazon Games doesn't support cloud saves
  return ''
}

export async function uninstall({ appName }: RemoveArgs): Promise<ExecResult> {
  const commandParts = ['uninstall', appName]

  const res = await runNileCommand(
    commandParts,
    createAbortController(appName),
    {
      logMessagePrefix: `Uninstalling ${appName}`
    }
  )
  deleteAbortController(appName)

  if (res.error) {
    logError(['Failed to uninstall', `${appName}:`, res.error], LogPrefix.Nile)
  } else if (!res.abort) {
    const gameInfo = getGameInfo(appName)
    await removeShortcutsUtil(gameInfo)
    await removeNonSteamGame({ gameInfo })
    installState(appName, false)
  }
  sendFrontendMessage('refreshLibrary', 'nile')
  return res
}

export async function update(appName: string): Promise<InstallResult> {
  const { maxWorkers } = GlobalConfig.get().getSettings()
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []

  const logPath = join(gamesConfigPath, `${appName}.log`)

  const commandParts = ['update', ...workers, appName]

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(appName, 'updating', data)
  }

  const res = await runNileCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Updating ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.abort) {
    return { status: 'abort' }
  }

  if (res.error) {
    if (!res.error.includes('signal')) {
      logError(['Failed to update', appName, res.error], LogPrefix.Nile)
    }
    return { status: 'error', error: res.error }
  }

  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner: 'nile',
    status: 'done'
  })

  return { status: 'done' }
}

export async function forceUninstall(appName: string) {
  removeFromInstalledConfig(appName)
}

export async function stop(appName: string, stopWine = true) {
  const pattern = process.platform === 'linux' ? appName : 'nile'
  killPattern(pattern)

  if (stopWine && !isNative()) {
    const gameSettings = await getSettings(appName)
    await shutdownWine(gameSettings)
  }
}

export function isGameAvailable(appName: string): boolean {
  const info = getGameInfo(appName)
  return Boolean(
    info?.is_installed &&
      info.install.install_path &&
      existsSync(info.install.install_path)
  )
}
