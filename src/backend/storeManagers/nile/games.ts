import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallProgress
} from 'common/types'
import { InstallResult } from 'common/types/game_manager'
import {
  runRunnerCommand as runNileCommand,
  getGameInfo as nileLibraryGetGameInfo,
  // getInstallInfo,
  changeGameInstallPath
} from './library'
import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logsDisabled
} from 'backend/logger/logger'
import {
  gamesConfigPath,
  isFlatpak,
  isLinux,
  isWindows
} from 'backend/constants'
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
import { appendFileSync } from 'graceful-fs'
import { logFileLocation } from 'backend/storeManagers/storeManagerCommon/games'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import { t } from 'i18next'
import { getWineFlags } from 'backend/utils/compatibility_layers'
import shlex from 'shlex'
import { join } from 'path'
import { getNileBin, moveOnUnix, moveOnWindows } from 'backend/utils'
import { GlobalConfig } from 'backend/config'
import { gameAnticheatInfo } from 'backend/anticheat/utils'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'

// used when downloading games, store the download size read from Nile's output
interface currentDownloadSizeMap {
  [key: string]: number
}
const currentDownloadSize: currentDownloadSizeMap = {}

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

export async function importGame(): Promise<ExecResult> {
  // Currently not supported in Nile
  return {
    stderr: '',
    stdout: ''
  }
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
  data: string
  // totalDownloadSize: number
) {
  const downloadSizeMatch = data.match(/Download size: ([\d.]+)MB/)
  logDebug(['Download size:', downloadSizeMatch], LogPrefix.Nile)

  // store the download size, needed for correct calculation
  // when cancel/resume downloads
  if (downloadSizeMatch) {
    currentDownloadSize[appName] = parseFloat(downloadSizeMatch[1])
  }

  if (!Object.hasOwn(tmpProgress, appName)) {
    tmpProgress[appName] = defaultTmpProgress()
  }

  // const progress = tmpProgress[appName]

  // TODO: Download Progress
  // original is in bytes, convert to MiB with 2 decimals
  // totalDownloadSize = Math.round((totalDownloadSize / 1024 / 1024) * 100) / 100

  return
}

export async function install(
  appName: string,
  { path }: InstallArgs
): Promise<InstallResult> {
  const { maxWorkers } = GlobalConfig.get().getSettings()
  // const info = await getInstallInfo(appName)
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []

  const logPath = join(gamesConfigPath, `${appName}.log`)

  const commandParts = ['install', '--base-path', path, ...workers, appName]

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(
      appName,
      'installing',
      data
      // info.manifest?.download_size
    )
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

  const antiCheatInfo = gameAnticheatInfo(getGameInfo(appName).namespace)

  if (antiCheatInfo && isLinux) {
    const gameSettings = await getSettings(appName)

    gameSettings.eacRuntime =
      antiCheatInfo.anticheats.includes('Easy Anti-Cheat')
    if (gameSettings.eacRuntime && isFlatpak) gameSettings.useGameMode = true
    gameSettings.battlEyeRuntime = antiCheatInfo.anticheats.includes('BattlEye')
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

export async function repair(/* appName: string */): Promise<ExecResult> {
  return {
    stderr: '',
    stdout: ''
  }
}

export async function syncSaves(): Promise<string> {
  /* appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[] */
  return ''
}

export async function uninstall(/* args: RemoveArgs */): Promise<ExecResult> {
  return {
    stderr: '',
    stdout: ''
  }
}

export async function update(/* appName: string */): Promise<InstallResult> {
  return {
    status: 'abort'
  }
}

export async function forceUninstall(/* appName: string */) {
  return
}

export async function stop(/* appName: string, stopWine?: boolean */) {
  return
}

export function isGameAvailable(/* appname: string */) {
  return true
}
