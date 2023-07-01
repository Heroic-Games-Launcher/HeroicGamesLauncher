import { ExecResult, ExtraInfo, GameInfo, GameSettings } from 'common/types'
import { InstallResult } from 'common/types/game_manager'
import {
  runRunnerCommand as runNileCommand,
  getGameInfo as nileLibraryGetGameInfo
} from './library'
import { LogPrefix, logError, logsDisabled } from 'backend/logger/logger'
import { isWindows } from 'backend/constants'
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
import { getNileBin } from 'backend/utils'

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
  /* appName: string,
  path: string,
  platform: InstallPlatform */
  return {
    stderr: '',
    stdout: ''
  }
}

export function onInstallOrUpdateOutput() {
  /* appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number */
  return
}

export async function install(): Promise<InstallResult> {
  /* appName: string,
  args: InstallArgs */
  return {
    status: 'abort'
  }
}

export function isNative(): boolean {
  return isWindows
}

export async function addShortcuts(/* appName: string, fromMenu?: boolean */) {
  return
}

export async function removeShortcuts(/* appName: string */) {
  return
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

export async function moveInstall(): Promise<InstallResult> {
  /* appName: string,
  newInstallPath: string */
  return {
    status: 'abort'
  }
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
