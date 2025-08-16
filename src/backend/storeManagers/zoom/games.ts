import { GameConfig } from '../../game_config'
import { GlobalConfig } from '../../config'
import {
  errorHandler,
  getFileSize,
  parseSize,
  spawnAsync,
  sendProgressUpdate,
  sendGameStatusUpdate,
  getPathDiskSize
} from '../../utils'
import { join } from 'node:path'
import axios, { AxiosProgressEvent } from 'axios'
import { createWriteStream } from 'node:fs' // Use node:fs for createWriteStream
import { pipeline } from 'node:stream/promises' // Use node:stream/promises for pipeline
import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstalledInfo,
  InstallProgress,
  LaunchOption,
  InstallPlatform
} from 'common/types'
import { existsSync, rmSync } from 'graceful-fs'
import {
  installedGamesStore,
  libraryStore
} from './electronStores'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning,
  createGameLogWriter
} from 'backend/logger'
import { ZoomUser } from './user'
import {
  prepareLaunch,
  prepareWineLaunch,
  setupEnvVars,
  setupWrapperEnvVars,
  setupWrappers,
  callRunner
} from '../../launcher'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { removeNonSteamGame } from '../../shortcuts/nonesteamgame/nonesteamgame'
import shlex from 'shlex'
import {
  ZoomInstallPlatform,
  ZoomDownloadFile
} from 'common/types/zoom'
import { t } from 'i18next'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { sendFrontendMessage } from '../../ipc'
import { RemoveArgs } from 'common/types/game_manager'
import {
  isLinux, isMac, isWindows
} from 'backend/constants/environment'
import { getInstallers, getGameInfo as getZoomLibraryGameInfo } from './library'

import type LogWriter from 'backend/logger/log_writer'

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const gameInfo = getGameInfo(appName)

  // Zoom.py doesn't have direct equivalents for reqs, changelog, etc.
  // This part would need to be implemented if the Zoom API provides such data.
  const extra: ExtraInfo = {
    about: { description: '', shortDescription: '' },
    reqs: [],
    releaseDate: undefined,
    storeUrl: undefined,
    changelog: undefined
  }
  return extra
}

export function getGameInfo(appName: string): GameInfo {
  const info = getZoomLibraryGameInfo(appName)
  if (!info) {
    logError(
      [
        'Could not get game info for',
        `${appName},`,
        'returning empty object. Something is probably gonna go wrong soon'
      ],
      LogPrefix.Zoom
    )
    return {
      app_name: '',
      runner: 'zoom',
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

export async function getSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export async function importGame(
  appName: string,
  folderPath: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  platform: InstallPlatform
): Promise<ExecResult> {
  platform = platform.toLowerCase() as ZoomInstallPlatform
  // The original zoom.py doesn't have an explicit "import" function for installed games.
  // It relies on scanning the library. This function might need to be adapted
  // if Zoom has a way to import already installed games.
  logWarning(`Import game not fully implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return { stdout: '', stderr: 'Import not fully implemented' }
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
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  totalDownloadSize = -1
) {
  if (!Object.hasOwn(tmpProgress, appName)) {
    tmpProgress[appName] = defaultTmpProgress()
  }
  const progress = tmpProgress[appName]

  // This part needs to be adapted to parse output from the actual installer.
  // For now, it's a placeholder.
  logDebug(`Installer output for ${appName}: ${data}`, LogPrefix.Zoom)

  // Simulate progress for now
  if (progress.percent === undefined) {
    progress.percent = 0
  }
  progress.percent += 1 // Increment for testing purposes
  if (progress.percent > 100) {
    progress.percent = 100
  }
  progress.bytes = 'N/A'
  progress.eta = 'N/A'
  progress.downSpeed = 0
  progress.diskSpeed = 0

  sendProgressUpdate({
    appName: appName,
    runner: 'zoom',
    status: action,
    progress: progress
  })

  if (progress.percent === 100) {
    tmpProgress[appName] = defaultTmpProgress()
  }
}

export async function install(
  appName: string,
  {
    path,
    platformToInstall,
    installLanguage
  }: InstallArgs
): Promise<{
  status: 'done' | 'error' | 'abort'
  error?: string
}> {
  logInfo(`Installing ${appName} to ${path} for platform ${platformToInstall}`, LogPrefix.Zoom)

  const gameInfo = getGameInfo(appName)
  if (!gameInfo) {
    logError(`Game info not found for ${appName}`, LogPrefix.Zoom)
    return { status: 'error', error: 'Game info not found' }
  }

  const installPlatform = platformToInstall.toLowerCase() as ZoomInstallPlatform

  // Fetch installer URL
  const installers: ZoomDownloadFile[] = await getInstallers(installPlatform, appName)
  if (installers.length === 0 || !installers[0].url) {
    logError(`No installer found for ${appName} on ${installPlatform}`, LogPrefix.Zoom)
    return { status: 'error', error: 'No installer found' }
  }

  const installerUrl = installers[0].url
  const installerFilename = installers[0].filename
  const installerSize = installers[0].size

  const downloadPath = join(path, installerFilename)

  // Download the installer
  logInfo(`Downloading installer from ${installerUrl} to ${downloadPath}`, LogPrefix.Zoom)
  try {
    const response = await axios.get(installerUrl, {
      responseType: 'stream',
      onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
        const percent = progressEvent.progress ? Math.round(progressEvent.progress * 100) : undefined
        onInstallOrUpdateOutput(appName, 'installing', `Progress: ${percent}%`, parseSize(installerSize))
      }
    })

    await pipeline(response.data, createWriteStream(downloadPath)) // Use pipeline for robust stream handling
    logInfo(`Installer downloaded to ${downloadPath}`, LogPrefix.Zoom)
  } catch (error) {
    logError(['Failed to download installer:', error], LogPrefix.Zoom)
    return { status: 'error', error: `Failed to download installer: ${error}` }
  }

  // Determine executable based on platform (similar to zoom.py's AUTO_ELF_EXE, AUTO_WIN32_EXE)
  let executable = ''
  if (installPlatform === 'linux') {
    // For Linux, assume the downloaded file is the executable or an archive to extract
    // This needs more sophisticated handling based on actual Zoom Linux installers
    executable = downloadPath // Placeholder
    // If it's an archive, we'd need to extract it here.
    // For now, we'll assume it's a direct executable or a self-extracting one.
  } else { // windows
    executable = downloadPath // Assume it's a .exe installer
  }

  // Execute the installer
  logInfo(`Executing installer: ${executable}`, LogPrefix.Zoom)
  let installResult: ExecResult

  if (installPlatform === 'linux') {
    // For Linux, assume the downloaded file is the executable or an archive to extract
    // This needs more sophisticated handling based on actual Zoom Linux installers
    // For now, we'll try to execute it directly.
    installResult = await spawnAsync(executable, [], { cwd: path })
  } else { // windows
    // For Windows, use runWineCommand
    const gameSettings = await getSettings(appName)
    installResult = await callRunner(
      [executable],
      { name: 'zoom', logPrefix: LogPrefix.Zoom, bin: executable, dir: path },
      {
        env: setupEnvVars(gameSettings, path),
        logMessagePrefix: `Installing ${appName}`,
        logWriters: [await createGameLogWriter(appName, 'zoom')],
        abortId: appName
      }
    )
  }

  if (installResult.error) {
    logError(['Installer execution failed:', installResult.error], LogPrefix.Zoom)
    return { status: 'error', error: `Installer execution failed: ${installResult.error}` }
  }

  // After successful installation, we need to determine the actual executable path
  // This is a placeholder and might need more sophisticated logic based on how Zoom installers work.
  // For now, we'll assume the game is installed directly into the 'path' and the executable is the installer itself.
  // In a real scenario, you might need to scan the 'path' for the main executable.
  const finalExecutable = executable // Placeholder, needs actual detection

  const installedData: InstalledInfo = {
    platform: installPlatform,
    executable: finalExecutable,
    install_path: path,
    install_size: getFileSize(installerSize), // This might need to be the actual installed size, not just installer size
    is_dlc: false,
    version: '1.0', // Placeholder, ideally extracted from installer or API
    appName: appName,
    installedDLCs: [],
    language: installLanguage,
    versionEtag: '',
    buildId: '',
    pinnedVersion: false
  }
  const array = installedGamesStore.get('installed', [])
  array.push(installedData)
  installedGamesStore.set('installed', array)
  const libraryGame = libraryStore.get('games', []).find(g => g.app_name === appName)
  if (libraryGame) {
    libraryGame.is_installed = true
    libraryGame.install = installedData
    sendFrontendMessage('pushGameToLibrary', libraryGame)
  }

  logInfo(`Installation of ${appName} completed.`, LogPrefix.Zoom)
  return { status: 'done' }
}

export function isNative(appName: string): boolean {
  const gameInfo = getGameInfo(appName)
  if (isWindows) {
    return true
  }

  if (isMac && gameInfo.install.platform === 'osx') {
    return true
  }

  if (isLinux && gameInfo.install.platform === 'linux') {
    return true
  }

  return false
}

export async function addShortcuts(appName: string, fromMenu?: boolean) {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

export async function removeShortcuts(appName: string) {
  return removeShortcutsUtil(getGameInfo(appName))
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args: string[] = []
): Promise<boolean> {
  const gameSettings = await getSettings(appName)
  const gameInfo = getGameInfo(appName)

  if (
    !gameInfo.install ||
    !gameInfo.install.install_path ||
    !gameInfo.install.platform ||
    !gameInfo.install.executable
  ) {
    logError(`Missing install info for ${appName}`, LogPrefix.Zoom)
    return false
  }

  if (!existsSync(gameInfo.install.install_path)) {
    errorHandler({
      error: 'appears to be deleted',
      runner: 'zoom',
      appName: gameInfo.app_name
    })
    return false
  }

  const {
    success: launchPrepSuccess,
    failureReason: launchPrepFailReason,
    mangoHudCommand,
    gameScopeCommand,
    gameModeBin,
    steamRuntime
  } = await prepareLaunch(gameSettings, logWriter, gameInfo, isNative(appName))
  if (!launchPrepSuccess) {
    logWriter.logError(['Launch aborted:', launchPrepFailReason])
    showDialogBoxModalAuto({
      title: t('box.error.launchAborted', 'Launch aborted'),
      message: launchPrepFailReason!,
      type: 'ERROR'
    })
    return false
  }

  let commandEnv = {
    ...process.env,
    ...setupWrapperEnvVars({ appName, appRunner: 'zoom' }),
    ...(isWindows
      ? {}
      : setupEnvVars(gameSettings, gameInfo.install.install_path))
  }

  const wrappers = setupWrappers(
    gameSettings,
    mangoHudCommand,
    gameModeBin,
    gameScopeCommand,
    steamRuntime?.length ? [...steamRuntime] : undefined
  )

  const launchArgumentsArgs =
    launchArguments &&
    (launchArguments.type === undefined || launchArguments.type === 'basic')
      ? launchArguments.parameters
      : ''

  const commandParts = [
    gameInfo.install.executable,
    ...shlex.split(launchArgumentsArgs),
    ...shlex.split(gameSettings.launcherArgs ?? ''),
    ...args
  ]

  sendGameStatusUpdate({ appName, runner: 'zoom', status: 'playing' })

  const { error, abort } = await callRunner(
    commandParts,
    { name: 'zoom', logPrefix: LogPrefix.Zoom, bin: gameInfo.install.executable, dir: gameInfo.install.install_path },
    {
      env: commandEnv,
      wrappers,
      logMessagePrefix: `Launching ${gameInfo.title}`,
      logWriters: [logWriter],
      abortId: appName
    }
  )

  if (abort) {
    return true
  }

  if (error) {
    logError(['Error launching game:', error], LogPrefix.Zoom)
  }

  return !error
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
  logWarning(`Move install not implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return { status: 'error', error: 'Move install not implemented' }
}

export async function repair(appName: string): Promise<ExecResult> {
  logWarning(`Repair not implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return { stdout: '', stderr: 'Repair not implemented' }
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string
): Promise<string> {
  logWarning(`Sync saves not implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return 'Sync saves not implemented'
}

export async function uninstall({
  appName,
  shouldRemovePrefix
}: RemoveArgs): Promise<ExecResult> {
  const array = installedGamesStore.get('installed', [])
  const index = array.findIndex((game) => game.appName === appName)
  if (index === -1) {
    throw Error("Game isn't installed")
  }

  const [object] = array.splice(index, 1)
  logInfo(['Removing', object.install_path], LogPrefix.Zoom)

  if (existsSync(object.install_path)) {
    rmSync(object.install_path, { recursive: true })
  }
  installedGamesStore.set('installed', array)
  const gameInfo = getGameInfo(appName)
  gameInfo.is_installed = false
  gameInfo.install = { is_dlc: false }
  await removeShortcutsUtil(gameInfo)
  await removeNonSteamGame({ gameInfo })
  sendFrontendMessage('pushGameToLibrary', gameInfo)
  return { stdout: 'Uninstalled', stderr: '' }
}

export async function update(
  appName: string,
  updateOverwrites?: {
    build?: string
    branch?: string
    language?: string
    dlcs?: string[]
    dependencies?: string[]
  }
): Promise<{ status: 'done' | 'error'; error?: string }> {
  logWarning(`Update not implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return { status: 'error', error: 'Update not implemented' }
}

export async function forceUninstall(appName: string): Promise<void> {
  const installed = installedGamesStore.get('installed', [])
  const newInstalled = installed.filter((g) => g.appName !== appName)
  installedGamesStore.set('installed', newInstalled)
  const gameInfo = getGameInfo(appName)
  gameInfo.is_installed = false
  gameInfo.install = { is_dlc: false }
  sendFrontendMessage('pushGameToLibrary', gameInfo)
}

export async function stop(appName: string, stopWine = true): Promise<void> {
  logWarning(`Stop not fully implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  // For now, we don't have a specific process to stop for Zoom games
  // If wine is used, it will be handled by the launcher's wine cleanup.
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const info = getGameInfo(appName)
    if (info && info.is_installed) {
      if (info.install.install_path && existsSync(info.install.install_path)) {
        resolve(true)
      } else {
        resolve(false)
      }
    }
    resolve(false)
  })
}
