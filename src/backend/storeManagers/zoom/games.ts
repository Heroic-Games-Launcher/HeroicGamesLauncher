import { GameConfig } from '../../game_config'
import {
  errorHandler,
  getFileSize,
  parseSize,
  spawnAsync,
  sendProgressUpdate,
  sendGameStatusUpdate
} from '../../utils'
import { join, relative, dirname, basename } from 'node:path'
import * as fs from 'fs'
import axios, { AxiosProgressEvent } from 'axios'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
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
import { installedGamesStore, libraryStore } from './electronStores'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning,
  createGameLogWriter
} from 'backend/logger'
import {
  prepareLaunch,
  setupEnvVars,
  setupWrapperEnvVars,
  setupWrappers,
  callRunner,
  getKnownFixesEnvVariables,
  prepareWineLaunch,
  runWineCommand
} from '../../launcher'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { removeNonSteamGame } from '../../shortcuts/nonesteamgame/nonesteamgame'
import shlex from 'shlex'
import { ZoomInstallPlatform, ZoomDownloadFile } from 'common/types/zoom'
import { t } from 'i18next'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { sendFrontendMessage } from '../../ipc'
import { RemoveArgs } from 'common/types/game_manager'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import {
  getInstallers,
  getGameInfo as getZoomLibraryGameInfo,
  refresh,
  updateGameInLibrary
} from './library'
import { isUmuSupported } from 'backend/utils/compatibility_layers'
import { getUmuId } from 'backend/wiki_game_info/umu/utils'

import type LogWriter from 'backend/logger/log_writer'

async function findDosboxExecutable(dir: string): Promise<string | undefined> {
  let list: fs.Dirent[]
  try {
    list = await fs.promises.readdir(dir, { withFileTypes: true })
  } catch (error) {
    logError(
      `Error reading directory ${dir} for dosbox.exe: ${error}`,
      LogPrefix.Zoom
    )
    return undefined // Cannot read dir, so stop here for this branch
  }

  for (const file of list) {
    const fullPath = join(dir, file.name)
    if (file.isDirectory()) {
      const result = await findDosboxExecutable(fullPath)
      if (result) {
        return result
      }
    } else if (file.name.toLowerCase() === 'dosbox.exe') {
      return fullPath
    }
  }

  return undefined
}

async function findConfFiles(dir: string): Promise<string[]> {
  let confFiles: string[] = []
  try {
    const list = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const file of list) {
      const fullPath = join(dir, file.name)
      if (file.isDirectory()) {
        confFiles = confFiles.concat(await findConfFiles(fullPath))
      } else if (file.name.toLowerCase().endsWith('.conf')) {
        confFiles.push(fullPath)
      }
    }
  } catch (error) {
    logError(`Error finding .conf files in ${dir}: ${error}`, LogPrefix.Zoom)
  }
  return confFiles
}

export async function getExtraInfo(): Promise<ExtraInfo> {
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
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  folderPath: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _platform: InstallPlatform
): Promise<ExecResult> {
  // The original zoom.py doesn't have an explicit "import" function for installed games.
  // It relies on scanning the library. This function might need to be adapted
  // if Zoom has a way to import already installed games.
  logWarning(
    `Import game not fully implemented for Zoom: ${appName}`,
    LogPrefix.Zoom
  )
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
  { path, platformToInstall, installLanguage }: InstallArgs
): Promise<{
  status: 'done' | 'error' | 'abort'
  error?: string
}> {
  logInfo(
    `Installing ${appName} to ${path} for platform ${platformToInstall}`,
    LogPrefix.Zoom
  )
  logInfo(`Installation path: ${path}`, LogPrefix.Zoom)

  const gameInfo = getGameInfo(appName)
  if (!gameInfo || !gameInfo.folder_name) {
    logError(`Game info not found for ${appName}`, LogPrefix.Zoom)
    return { status: 'error', error: 'Game info not found' }
  }

  const installPlatform = platformToInstall.toLowerCase() as ZoomInstallPlatform
  let finalInstallPlatform = installPlatform

  // Fetch installer URL
  const installers: ZoomDownloadFile[] = await getInstallers(
    installPlatform,
    appName
  )
  if (installers.length === 0 || !installers[0].url) {
    logError(
      `No installer found for ${appName} on ${installPlatform}`,
      LogPrefix.Zoom
    )
    return { status: 'error', error: 'No installer found' }
  }

  const installerUrl = installers[0].url
  const installerFilename = installers[0].filename
  const installerSize = installers[0].size

  const downloadPath = join(path, gameInfo.folder_name, installerFilename)

  // Create game directory
  fs.mkdirSync(join(path, gameInfo.folder_name), { recursive: true })

  // Download the installer
  logInfo(
    `Downloading installer from ${installerUrl} to ${downloadPath}`,
    LogPrefix.Zoom
  )
  try {
    const response = await axios.get(installerUrl, {
      responseType: 'stream',
      onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
        const percent = progressEvent.progress
          ? Math.round(progressEvent.progress * 100)
          : undefined
        onInstallOrUpdateOutput(
          appName,
          'installing',
          `Progress: ${percent}%`,
          parseSize(installerSize)
        )
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
  } else {
    // windows
    executable = downloadPath // Assume it's a .exe installer
  }

  // Execute the installer
  logInfo(`Executing installer: ${executable}`, LogPrefix.Zoom)
  let installResult: ExecResult
  let confFilesBefore: string[] = []

  if (installPlatform === 'linux') {
    if (downloadPath.endsWith('.tar.xz')) {
      logInfo(`Extracting ${downloadPath}...`, LogPrefix.Zoom)
      installResult = await spawnAsync('tar', [
        '-xf',
        downloadPath,
        '-C',
        join(path, gameInfo.folder_name)
      ])
      let gamePath = join(path, gameInfo.folder_name)
      const files = await fs.promises.readdir(join(path, gameInfo.folder_name))
      const gameDir = files.find((f) =>
        fs.statSync(join(path, gameInfo.folder_name!, f)).isDirectory()
      )
      if (gameDir) {
        gamePath = join(path, gameInfo.folder_name, gameDir)
      }

      const exe = join(gamePath, 'start.sh')
      if (existsSync(exe)) {
        executable = exe
        await fs.promises.chmod(executable, '755')
      }
    } else {
      await fs.promises.chmod(executable, '755')
      installResult = await spawnAsync(executable, [], {
        cwd: join(path, gameInfo.folder_name)
      })
    }
  } else {
    // windows
    // For Windows, use runWineCommand
    const gameSettings = await getSettings(appName)
    const winePrefix = gameSettings.winePrefix
    const zoomPlatformPath = join(winePrefix, 'drive_c', 'ZOOM PLATFORM')
    if (fs.existsSync(zoomPlatformPath)) {
      confFilesBefore = await findConfFiles(zoomPlatformPath)
    } else {
      fs.mkdirSync(zoomPlatformPath, { recursive: true })
    }
    installResult = await runWineCommand({
      commandParts: [executable],
      gameSettings,
      wait: true,
      options: {
        logMessagePrefix: `Installing ${appName}`,
        logWriters: [await createGameLogWriter(appName, 'zoom', 'install')],
        abortId: appName
      }
    })
  }

  if (installResult.error) {
    logError(
      ['Installer execution failed:', installResult.error],
      LogPrefix.Zoom
    )
    return {
      status: 'error',
      error: `Installer execution failed: ${installResult.error}`
    }
  }

  // After successful installation, we need to determine the actual executable path
  let isDosbox = false
  let dosboxConf: string[] | undefined
  let finalExecutable = ''

  if (installPlatform === 'windows') {
    const gameSettings = await getSettings(appName)
    const winePrefix = gameSettings.winePrefix
    const installPath = join(winePrefix, 'drive_c', 'ZOOM PLATFORM')
    logInfo(`Searching for executable in ${installPath}`, LogPrefix.Zoom)

    const confFilesAfter = await findConfFiles(installPath)
    const newConfFiles = confFilesAfter.filter(
      (f) => !confFilesBefore.includes(f)
    )

    if (newConfFiles.length > 0) {
      dosboxConf = newConfFiles
      const gameDirectory = dirname(newConfFiles[0])
      const dosboxExePath = await findDosboxExecutable(gameDirectory)
      if (dosboxExePath) {
        isDosbox = true
        if (isWindows) {
          finalExecutable = relative(installPath, dosboxExePath)
        } else {
          finalExecutable = 'dosbox'
          finalInstallPlatform = 'linux'
          const sourceDir = gameDirectory
          const destDir = join(path, gameInfo.folder_name)
          logInfo(
            `Copying DOSBox game files from ${sourceDir} to ${destDir}`,
            LogPrefix.Zoom
          )
          const items = await fs.promises.readdir(sourceDir)
          for (const item of items) {
            await fs.promises.cp(join(sourceDir, item), join(destDir, item), {
              recursive: true
            })
          }
          dosboxConf = newConfFiles.map((file) => join(destDir, basename(file)))
        }
      }
    }

    if (!isDosbox) {
      const findExes = async (dir: string): Promise<string[]> => {
        let exes: string[] = []
        try {
          const list = await fs.promises.readdir(dir, { withFileTypes: true })
          for (const file of list) {
            const fullPath = join(dir, file.name)
            if (file.isDirectory()) {
              exes = exes.concat(await findExes(fullPath))
            } else if (file.name.toLowerCase().endsWith('.exe')) {
              exes.push(fullPath)
            }
          }
        } catch (error) {
          logError(
            `Error finding .exe files in ${dir}: ${error}`,
            LogPrefix.Zoom
          )
        }
        return exes
      }
      const exes = (await findExes(installPath))
        .map((f) => relative(installPath, f))
        .filter((name) => !/setup|unins|redist/i.test(name))

      if (exes.length === 1) {
        finalExecutable = exes[0]
      } else if (exes.length > 1) {
        // Try to find an exe with the game's name in it
        const gameInfo = getGameInfo(appName)
        const gameName = gameInfo.title.toLowerCase().replace(/[^a-z0-9]/g, '')
        const bestMatch = exes.find((exe) =>
          exe
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .includes(gameName)
        )
        if (bestMatch) {
          finalExecutable = bestMatch
        } else {
          // As a fallback, pick the largest exe
          let largestSize = 0
          for (const exe of exes) {
            const exePath = join(installPath, exe)
            const stats = fs.statSync(exePath)
            if (stats.size > largestSize) {
              largestSize = stats.size
              finalExecutable = exe
            }
          }
        }
      }
    }
  } else {
    finalExecutable = executable
  }

  if (!finalExecutable) {
    logError(['Could not find executable for', appName], LogPrefix.Zoom)
    showDialogBoxModalAuto({
      title: t('box.error.executableNotFound', 'Executable not found'),
      message: t(
        'box.error.executableNotFoundMessage',
        'Heroic could not find the executable for this game. Please set it manually in the game settings.'
      ),
      type: 'ERROR'
    })
  }

  const installedData: InstalledInfo = {
    platform: finalInstallPlatform,
    executable: finalExecutable.replace(
      '{app}',
      join(path, gameInfo.folder_name)
    ),
    install_path: join(path, gameInfo.folder_name),
    isDosbox,
    dosboxConf,
    install_size: getFileSize(parseSize(installerSize)), // This might need to be the actual installed size, not just installer size
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
  refresh()
  const libraryGame = getGameInfo(appName)
  if (libraryGame) {
    libraryGame.is_installed = true
    libraryGame.install = installedData
    updateGameInLibrary(libraryGame)
    libraryStore.set(
      'games',
      libraryStore
        .get('games', [])
        .map((g) => (g.app_name === appName ? libraryGame : g))
    )
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

  const commandEnv = {
    ...process.env,
    ...setupWrapperEnvVars({ appName, appRunner: 'zoom' }),
    ...(isWindows
      ? {}
      : setupEnvVars(gameSettings, gameInfo.install.install_path)),
    ...getKnownFixesEnvVariables(appName, 'zoom')
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
    ...shlex.split(launchArgumentsArgs),
    ...shlex.split(gameSettings.launcherArgs ?? ''),
    ...args
  ]

  if (gameInfo.install.isDosbox && gameInfo.install.dosboxConf) {
    gameInfo.install.dosboxConf.forEach((conf) => {
      commandParts.push('-conf', conf)
    })
  }

  sendGameStatusUpdate({ appName, runner: 'zoom', status: 'playing' })

  if (isNative(appName)) {
    const isNativeDosbox = isNative(appName) && gameInfo.install.isDosbox
    const { error, abort } = await callRunner(
      commandParts,
      {
        name: 'zoom',
        logPrefix: LogPrefix.Zoom,
        bin: gameInfo.install.executable,
        dir: isNativeDosbox ? undefined : gameInfo.install.install_path
      },
      {
        env: commandEnv,
        wrappers,
        logMessagePrefix: `Launching ${gameInfo.title}`,
        logWriters: [logWriter],
        abortId: appName,
        cwd: gameInfo.install.install_path
      }
    )

    if (abort) {
      return true
    }

    if (error) {
      logError(['Error launching game:', error], LogPrefix.Zoom)
    }

    return !error
  } else {
    const {
      success: wineLaunchPrepSuccess,
      failureReason: wineLaunchPrepFailReason,
      envVars
    } = await prepareWineLaunch('zoom', appName, logWriter)

    if (!wineLaunchPrepSuccess) {
      logWriter.logError(['Launch aborted:', wineLaunchPrepFailReason])
      showDialogBoxModalAuto({
        title: t('box.error.launchAborted', 'Launch aborted'),
        message: wineLaunchPrepFailReason!,
        type: 'ERROR'
      })
      return false
    }

    if (await isUmuSupported(gameSettings)) {
      const umuId = await getUmuId(gameInfo.app_name, gameInfo.runner)
      if (umuId) {
        commandEnv['GAMEID'] = umuId
      }
    }

    const executable = gameInfo.install.executable
    const result = await runWineCommand({
      commandParts: [basename(executable), ...commandParts],
      gameSettings,
      gameInstallPath: gameInfo.install.install_path,
      installFolderName: gameInfo.folder_name,
      protonVerb: 'waitforexitandrun',
      startFolder: dirname(
        join(gameSettings.winePrefix, 'drive_c', 'ZOOM PLATFORM', executable)
      ),
      options: {
        env: { ...commandEnv, ...envVars },
        wrappers,
        logMessagePrefix: `Launching ${gameInfo.title}`,
        logWriters: [logWriter],
        abortId: appName
      }
    })

    const hasError = result.code !== 0 && result.stderr

    if (hasError) {
      logError(['Error launching game:', result.stderr], LogPrefix.Zoom)
    }

    return !hasError
  }
}

export async function moveInstall(
  appName: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  newInstallPath: string
): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
  logWarning(
    `Move install not implemented for Zoom: ${appName}`,
    LogPrefix.Zoom
  )
  return { status: 'error', error: 'Move install not implemented' }
}

export async function repair(appName: string): Promise<ExecResult> {
  logWarning(`Repair not implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return { stdout: '', stderr: 'Repair not implemented' }
}

export async function syncSaves(
  appName: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  arg: string,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  path: string
): Promise<string> {
  logWarning(`Sync saves not implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  return 'Sync saves not implemented'
}

export async function uninstall({
  appName,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
  refresh()
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
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
  refresh()
  const gameInfo = getGameInfo(appName)
  gameInfo.is_installed = false
  gameInfo.install = { is_dlc: false }
  sendFrontendMessage('pushGameToLibrary', gameInfo)
}

export async function stop(
  appName: string /* eslint-disable-next-line @typescript-eslint/no-unused-vars */,
  stopWine = true
): Promise<void> {
  logWarning(`Stop not fully implemented for Zoom: ${appName}`, LogPrefix.Zoom)
  // For now, we don't have a specific process to stop for Zoom games
  // If wine is used, it will be handled by the launcher's wine cleanup.
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  const info = getGameInfo(appName)
  if (!info || !info.is_installed || !info.install.install_path) {
    return false
  }
  return existsSync(info.install.install_path)
}
