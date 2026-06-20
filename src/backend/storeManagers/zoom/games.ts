import { GameConfig } from '../../game_config'
import {
  errorHandler,
  getFileSize,
  parseSize,
  spawnAsync,
  sendGameStatusUpdate,
  sendProgressUpdate
} from '../../utils'
import { join, relative, dirname, basename, isAbsolute } from 'node:path'
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
  LaunchOption,
  InstallProgress
} from 'common/types'
import { existsSync, rmSync } from 'graceful-fs'
import { installedGamesStore, libraryStore } from './electronStores'
import {
  logError,
  logInfo,
  LogPrefix,
  logWarning,
  createGameLogWriter,
  logDebug
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
import { Game } from 'common/types/game_manager'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { libraryManagerMap } from '..'
import { isUmuSupported } from 'backend/utils/compatibility_layers'
import { getUmuId } from 'backend/wiki_game_info/umu/utils'

import type LogWriter from 'backend/logger/log_writer'
import { rm, writeFile } from 'node:fs/promises'

export default class ZoomGame extends Game {
  public readonly id: string
  public readonly runner = 'zoom'

  constructor(id: string) {
    super()
    this.id = id
  }

  toString(): string {
    return `ZoomGame(id=${this.id})`
  }

  private async findDosboxExecutable(dir: string): Promise<string | undefined> {
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
        const result = await this.findDosboxExecutable(fullPath)
        if (result) {
          return result
        }
      } else if (file.name.toLowerCase() === 'dosbox.exe') {
        return fullPath
      }
    }

    return undefined
  }

  private async findConfFiles(dir: string): Promise<string[]> {
    let confFiles: string[] = []
    try {
      const list = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const file of list) {
        const fullPath = join(dir, file.name)
        if (file.isDirectory()) {
          confFiles = confFiles.concat(await this.findConfFiles(fullPath))
        } else if (file.name.toLowerCase().endsWith('.conf')) {
          confFiles.push(fullPath)
        }
      }
    } catch (error) {
      logError(`Error finding .conf files in ${dir}: ${error}`, LogPrefix.Zoom)
    }
    return confFiles
  }

  async getExtraInfo(): Promise<ExtraInfo> {
    // Zoom.py doesn't have direct equivalents for reqs, changelog, etc.
    // This part would need to be implemented if the Zoom API provides such data.
    const extra: ExtraInfo = {
      about: { description: '', shortDescription: '' },
      reqs: [],
      storeUrl: undefined
    }
    return extra
  }

  getGameInfo(): GameInfo {
    const info = libraryManagerMap['zoom'].getGameInfo(this.id)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.id},`,
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

  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.id).config ||
      (await GameConfig.get(this.id).getSettings())
    )
  }

  async importGame(): Promise<ExecResult> {
    // The original zoom.py doesn't have an explicit "import" function for installed games.
    // It relies on scanning the library. This function might need to be adapted
    // if Zoom has a way to import already installed games.
    logWarning(
      `Import game not fully implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    return { stdout: '', stderr: 'Import not fully implemented' }
  }

  private defaultTmpProgress = () => ({
    bytes: '',
    eta: '',
    percent: undefined,
    diskSpeed: undefined,
    downSpeed: undefined
  })
  private tmpProgress: InstallProgress | undefined

  onInstallOrUpdateOutput(
    action: 'installing' | 'updating',
    data: string,
    total: number
  ) {
    if (data.length === 0) return

    if (!this.tmpProgress) {
      this.tmpProgress = this.defaultTmpProgress()
    }
    // This part needs to be adapted to parse output from the actual installer.
    // For now, it's a placeholder.
    logDebug(
      `Installer output for ${this.id}: ${data}% (total: ${getFileSize(total)})`,
      LogPrefix.Zoom
    )

    this.tmpProgress.percent = parseInt(data)
    if (this.tmpProgress.percent > 100) {
      this.tmpProgress.percent = 100
    }
    this.tmpProgress.bytes = 'N/A'
    this.tmpProgress.eta = 'N/A'
    this.tmpProgress.downSpeed = 0
    this.tmpProgress.diskSpeed = 0

    sendProgressUpdate(this, {
      status: action,
      progress: this.tmpProgress
    })
  }

  async install({
    path,
    platformToInstall,
    installLanguage
  }: InstallArgs): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    logInfo(
      `Installing ${this.id} to ${path} for platform ${platformToInstall}`,
      LogPrefix.Zoom
    )
    logInfo(`Installation path: ${path}`, LogPrefix.Zoom)

    const gameInfo = this.getGameInfo()
    if (!gameInfo || !gameInfo.folder_name) {
      logError(`Game info not found for ${this.id}`, LogPrefix.Zoom)
      return { status: 'error', error: 'Game info not found' }
    }

    const installPlatform =
      platformToInstall.toLowerCase() as ZoomInstallPlatform
    let finalInstallPlatform = installPlatform

    // Fetch installer URL
    const installers: ZoomDownloadFile[] = await libraryManagerMap[
      'zoom'
    ].getInstallers(installPlatform, this.id)
    if (installers.length === 0 || !installers[0].url) {
      logError(
        `No installer found for ${this.id} on ${installPlatform}`,
        LogPrefix.Zoom
      )
      return { status: 'error', error: 'No installer found' }
    }

    const installPath = join(path, gameInfo.folder_name)
    const downloadRoot = join(path, '.zoom-download')
    const infFilePath = join(downloadRoot, 'zoom_installer.inf')

    const totalSize = installers
      .map((file) => parseSize(file.size))
      .reduce((acc, num) => acc + num, 0)
    let downloaded = 0

    for (const file of installers) {
      const downloadPath = join(downloadRoot, file.filename)
      let fileDownloaded = 0

      // Create game directory
      fs.mkdirSync(downloadRoot, { recursive: true })

      // Download the installer
      logInfo(
        `Downloading installer from ${file.url} to ${downloadPath}`,
        LogPrefix.Zoom
      )

      if (!existsSync(downloadPath)) {
        try {
          const response = await axios.get(file.url!, {
            responseType: 'stream',
            onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
              let percent: undefined | number
              if (progressEvent.bytes) {
                fileDownloaded = fileDownloaded + progressEvent.bytes
                percent = Math.round(
                  ((downloaded + fileDownloaded) * 100) / totalSize
                )
              }

              this.onInstallOrUpdateOutput(
                'installing',
                `${percent}`,
                totalSize
              )
            }
          })

          await pipeline(response.data, createWriteStream(downloadPath)) // Use pipeline for robust stream handling
          logInfo(`Installer downloaded to ${downloadPath}`, LogPrefix.Zoom)

          downloaded = downloaded + parseSize(file.size)
        } catch (error) {
          logError(['Failed to download installer:', error], LogPrefix.Zoom)
          return {
            status: 'error',
            error: `Failed to download installer: ${error}`
          }
        }
      } else {
        logDebug(`File already exists ${downloadPath}, skipping`)
      }
    }

    // Execute the installer
    let installResult: ExecResult
    let confFilesBefore: string[] = []
    let executable: string = ''

    if (installPlatform === 'linux') {
      const downloadPath = join(installPath, installers[0].filename)

      if (downloadPath.endsWith('.tar.xz')) {
        logInfo(`Extracting ${downloadPath}...`, LogPrefix.Zoom)
        installResult = await spawnAsync('tar', [
          '-xf',
          downloadPath,
          '-C',
          installPath
        ])
        let gamePath = installPath
        const files = await fs.promises.readdir(installPath)
        const gameDir = files.find((f) =>
          fs.statSync(join(path, gameInfo.folder_name!, f)).isDirectory()
        )
        if (gameDir) {
          gamePath = join(installPath, gameDir)
        }

        const exe = join(gamePath, 'start.sh')
        if (existsSync(exe)) {
          executable = exe
          await fs.promises.chmod(executable, '755')
        }
      } else {
        await fs.promises.chmod(executable, '755')
        installResult = await spawnAsync(executable, [], {
          cwd: installPath
        })
      }
    } else {
      // windows

      // Determine executable based on platform (similar to zoom.py's AUTO_ELF_EXE, AUTO_WIN32_EXE)
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      executable = installers.find((file) =>
        file.filename.endsWith('.exe')
      )?.filename!

      logInfo(`Executing installer: ${executable}`, LogPrefix.Zoom)

      await writeFile(
        infFilePath,
        `[Setup]\nLang=english\nDisableWelcomePage=yes\nDisableDirPage=yes\nDisableProgramGroupPage=yes\nDisableReadyPage=yes\n`,
        { encoding: 'utf8' }
      )

      if (fs.existsSync(installPath)) {
        confFilesBefore = await this.findConfFiles(installPath)
      } else {
        fs.mkdirSync(installPath, { recursive: true })
      }

      installResult = await runWineCommand(this, {
        commandParts: [
          join(downloadRoot, executable),
          '/NORESTART',
          '/NOICONS',
          '/SP-',
          `/DIR=Z:${installPath.replaceAll('/', '\\')}`,
          `/LOADINF=Z:${infFilePath.replaceAll('/', '\\')}`,
          '/LOG=C:\\zoom_installer.log'
        ],
        wait: true,
        options: {
          logMessagePrefix: `Installing ${this.id}`,
          logWriters: [await createGameLogWriter(this, 'install')],
          abortId: this.id
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
      logInfo(`Searching for executable in ${installPath}`, LogPrefix.Zoom)

      const confFilesAfter = await this.findConfFiles(installPath)
      const newConfFiles = confFilesAfter.filter(
        (f) => !confFilesBefore.includes(f)
      )

      if (newConfFiles.length > 0) {
        dosboxConf = newConfFiles
        const gameDirectory = dirname(newConfFiles[0])
        const dosboxExePath = await this.findDosboxExecutable(gameDirectory)
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
            dosboxConf = newConfFiles.map((file) =>
              join(destDir, basename(file))
            )
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
          const gameInfo = this.getGameInfo()
          const gameName = gameInfo.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
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
    await rm(downloadRoot, { recursive: true, force: true })
    if (!finalExecutable) {
      logError(['Could not find executable for', this.id], LogPrefix.Zoom)
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
      executable: finalExecutable.replace('{app}', installPath),
      install_path: installPath,
      isDosbox,
      dosboxConf,
      install_size: getFileSize(totalSize), // This might need to be the actual installed size, not just installer size
      is_dlc: false,
      version: '1.0', // Placeholder, ideally extracted from installer or API
      appName: this.id,
      installedDLCs: [],
      language: installLanguage,
      versionEtag: '',
      buildId: '',
      pinnedVersion: false
    }
    const array = installedGamesStore.get('installed', [])
    array.push(installedData)
    installedGamesStore.set('installed', array)
    libraryManagerMap['zoom'].refresh()
    const libraryGame = this.getGameInfo()
    if (libraryGame) {
      libraryGame.is_installed = true
      libraryGame.install = installedData
      libraryManagerMap['zoom'].updateGameInLibrary(libraryGame)
      libraryStore.set(
        'games',
        libraryStore
          .get('games', [])
          .map((g) => (g.app_name === this.id ? libraryGame : g))
      )
    }

    logInfo(`Installation of ${this.id} completed.`, LogPrefix.Zoom)
    return { status: 'done' }
  }

  isNative(): boolean {
    const gameInfo = this.getGameInfo()
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

  async addShortcuts(fromMenu?: boolean) {
    return addShortcutsUtil(this, fromMenu)
  }

  async removeShortcuts() {
    return removeShortcutsUtil(this)
  }

  async launch(
    logWriter: LogWriter,
    launchArguments?: LaunchOption,
    args: string[] = []
  ): Promise<boolean> {
    const gameSettings = await this.getSettings()
    const gameInfo = this.getGameInfo()

    if (
      !gameInfo.install ||
      !gameInfo.install.install_path ||
      !gameInfo.install.platform ||
      !gameInfo.install.executable
    ) {
      logError(`Missing install info for ${this.id}`, LogPrefix.Zoom)
      return false
    }

    if (!existsSync(gameInfo.install.install_path)) {
      errorHandler('appears to be deleted', this.runner, this)
      return false
    }

    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      mangoHudCommand,
      gameScopeCommand,
      gameModeBin,
      steamRuntime
    } = await prepareLaunch(this, logWriter)
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
      ...setupWrapperEnvVars(this),
      ...(isWindows
        ? {}
        : setupEnvVars(gameSettings, gameInfo.install.install_path)),
      ...getKnownFixesEnvVariables(this)
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

    sendGameStatusUpdate(this, 'playing')

    if (this.isNative()) {
      const isNativeDosbox = this.isNative() && gameInfo.install.isDosbox
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
          abortId: this.id,
          cwd: gameInfo.install.install_path,
          game: this
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
      } = await prepareWineLaunch(this, logWriter)

      if (!wineLaunchPrepSuccess) {
        logWriter.logError(['Launch aborted:', wineLaunchPrepFailReason])
        showDialogBoxModalAuto({
          title: t('box.error.launchAborted', 'Launch aborted'),
          message: wineLaunchPrepFailReason!,
          type: 'ERROR'
        })
        return false
      }

      const executable = gameSettings.targetExe || gameInfo.install.executable
      const startFolder = isAbsolute(executable)
        ? dirname(executable)
        : dirname(join(gameInfo.install.install_path, executable))

      if (await isUmuSupported(this)) {
        const umuId = await getUmuId(this)
        if (umuId) {
          commandEnv['GAMEID'] = umuId
        }
      }

      const result = await runWineCommand(this, {
        commandParts: [basename(executable), ...commandParts],
        protonVerb: 'waitforexitandrun',
        startFolder,
        options: {
          env: { ...commandEnv, ...envVars },
          wrappers,
          logMessagePrefix: `Launching ${gameInfo.title}`,
          logWriters: [logWriter],
          abortId: this.id
        }
      })

      const hasError = result.code !== 0 && result.stderr

      if (hasError) {
        logError(['Error launching game:', result.stderr], LogPrefix.Zoom)
      }

      return !hasError
    }
  }

  async moveInstall(): Promise<
    { status: 'done' } | { status: 'error'; error: string }
  > {
    logWarning(
      `Move install not implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    return { status: 'error', error: 'Move install not implemented' }
  }

  async repair(): Promise<ExecResult> {
    logWarning(`Repair not implemented for Zoom: ${this.id}`, LogPrefix.Zoom)
    return { stdout: '', stderr: 'Repair not implemented' }
  }

  async syncSaves(): Promise<string> {
    logWarning(
      `Sync saves not implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    return 'Sync saves not implemented'
  }

  async uninstall(): Promise<ExecResult> {
    const array = installedGamesStore.get('installed', [])
    const index = array.findIndex((game) => game.appName === this.id)
    if (index === -1) {
      throw Error("Game isn't installed")
    }

    const [object] = array.splice(index, 1)
    logInfo(['Removing', object.install_path], LogPrefix.Zoom)

    if (existsSync(object.install_path)) {
      rmSync(object.install_path, { recursive: true })
    }
    installedGamesStore.set('installed', array)
    libraryManagerMap['zoom'].refresh()
    const gameInfo = this.getGameInfo()
    gameInfo.is_installed = false
    gameInfo.install = { is_dlc: false }
    await removeShortcutsUtil(this)
    await removeNonSteamGame(this)
    sendFrontendMessage('pushGameToLibrary', gameInfo)
    return { stdout: 'Uninstalled', stderr: '' }
  }

  async update(): Promise<{ status: 'done' | 'error'; error?: string }> {
    logWarning(`Update not implemented for Zoom: ${this.id}`, LogPrefix.Zoom)
    return { status: 'error', error: 'Update not implemented' }
  }

  async forceUninstall(): Promise<void> {
    const installed = installedGamesStore.get('installed', [])
    const newInstalled = installed.filter((g) => g.appName !== this.id)
    installedGamesStore.set('installed', newInstalled)
    libraryManagerMap['zoom'].refresh()
    const gameInfo = this.getGameInfo()
    gameInfo.is_installed = false
    gameInfo.install = { is_dlc: false }
    sendFrontendMessage('pushGameToLibrary', gameInfo)
  }

  async stop(): Promise<void> {
    logWarning(
      `Stop not fully implemented for Zoom: ${this.id}`,
      LogPrefix.Zoom
    )
    // For now, we don't have a specific process to stop for Zoom games
    // If wine is used, it will be handled by the launcher's wine cleanup.
  }

  async isGameAvailable(): Promise<boolean> {
    const info = this.getGameInfo()
    if (!info || !info.is_installed || !info.install.install_path) {
      return false
    }
    return existsSync(info.install.install_path)
  }
}
