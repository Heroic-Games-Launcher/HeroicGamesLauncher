/* eslint-disable @typescript-eslint/no-unused-vars */
import { GOGLibrary } from './library'
import { BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import {
  ExtraInfo,
  GameInfo,
  InstallInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  LaunchResult,
  GOGLoginData,
  InstalledInfo,
  InstallProgress
} from 'types'
import { existsSync, rmSync } from 'graceful-fs'
import {
  heroicGamesConfigPath,
  isWindows,
  execOptions,
  isMac,
  isLinux
} from '../constants'
import { configStore, installedGamesStore } from '../gog/electronStores'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { execAsync, size } from '../utils'
import { GOGUser } from './user'
import {
  launchCleanup,
  prepareLaunch,
  prepareWineLaunch,
  runWineCommand,
  setupEnvVars,
  setupWrappers
} from '../launcher'
import { addShortcuts, removeShortcuts } from '../shortcuts'
import setup from './setup'
import { getGogdlCommand, runGogdlCommand } from './library'

function verifyProgress(stderr: string): boolean {
  const text = stderr.split('\n').at(-1)
  return text.includes('INFO: Done')
}

class GOGGame extends Game {
  public appName: string
  public window = BrowserWindow.getAllWindows()[0]
  private static instances = new Map<string, GOGGame>()
  private constructor(appName: string) {
    super()
    this.appName = appName
  }
  public static get(appName: string) {
    if (!this.instances.get(appName)) {
      this.instances.set(appName, new GOGGame(appName))
    }
    return this.instances.get(appName)
  }
  public async getExtraInfo(namespace: string): Promise<ExtraInfo> {
    const gameInfo = GOGLibrary.get().getGameInfo(this.appName)
    let targetPlatform: 'windows' | 'osx' | 'linux' = 'windows'

    if (isMac && gameInfo.is_mac_native) {
      targetPlatform = 'osx'
    } else if (isLinux && gameInfo.is_linux_native) {
      targetPlatform = 'linux'
    } else {
      targetPlatform = 'windows'
    }

    const extra: ExtraInfo = {
      about: gameInfo.extra.about,
      reqs: await GOGLibrary.get().createReqsArray(this.appName, targetPlatform)
    }
    return extra
  }
  public async getGameInfo(): Promise<GameInfo> {
    return GOGLibrary.get().getGameInfo(this.appName)
  }
  async getInstallInfo(): Promise<InstallInfo> {
    return GOGLibrary.get().getInstallInfo(this.appName)
  }
  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }
  async hasUpdate(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }

  public async import(path: string): Promise<ExecResult> {
    const commandParts = ['import', path]
    const command = getGogdlCommand(commandParts)

    logInfo([`Importing ${this.appName} with:`, command], LogPrefix.Gog)

    const res = await runGogdlCommand(commandParts)

    if (res.error) {
      logError(
        ['Failed to import', `${this.appName}:`, res.error],
        LogPrefix.Gog
      )
    }
    await GOGLibrary.get().importGame(JSON.parse(res.stdout), path)
    return res
  }

  public onInstallOrUpdateOutput(
    action: 'installing' | 'updating',
    data: string
  ) {
    const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
    const bytesMatch = data.match(/Downloaded: (\S+) MiB/m)
    const progressMatch = data.match(/Progress: (\d+\.\d+) /m)
    if (etaMatch && bytesMatch && progressMatch) {
      const eta = etaMatch[1]
      const bytes = bytesMatch[1]
      let percent = parseFloat(progressMatch[1])
      if (percent < 0) percent = 0

      logInfo(
        [
          `Progress for ${this.appName}:`,
          `${percent}%/${bytes}MiB/${eta}`.trim()
        ],
        LogPrefix.Backend
      )

      this.window.webContents.send('setGameStatus', {
        appName: this.appName,
        runner: 'gog',
        status: action,
        progress: {
          eta,
          percent: `${percent.toFixed(0)}%`,
          bytes: `${bytes}MiB`
        }
      })
    }
  }

  public async install({
    path,
    installDlcs,
    platformToInstall,
    installLanguage
  }: InstallArgs): Promise<{ status: 'done' | 'error' }> {
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    if (GOGUser.isTokenExpired()) {
      await GOGUser.refreshToken()
    }
    const credentials = configStore.get('credentials') as GOGLoginData

    let installPlatform = platformToInstall.toLowerCase()
    if (installPlatform === 'mac') {
      installPlatform = 'osx'
    }

    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts: string[] = [
      'download',
      this.appName,
      '--platform',
      installPlatform,
      `--path=${path}`,
      '--token',
      `"${credentials.access_token}"`,
      withDlcs,
      `--lang=${installLanguage}`,
      ...workers
    ]
    const command = getGogdlCommand(commandParts)

    logInfo([`Installing ${this.appName} with:`, command], LogPrefix.Gog)

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput('installing', data)
    }

    const res = await runGogdlCommand(commandParts, {
      logFile: logPath,
      onOutput
    })

    if (res.error) {
      logError(
        ['Failed to install', `${this.appName}:`, res.error],
        LogPrefix.Gog
      )
      return { status: 'error' }
    }

    // Installation succeded
    // Save new game info to installed games store
    const installInfo = await this.getInstallInfo()
    const gameInfo = GOGLibrary.get().getGameInfo(this.appName)
    const isLinuxNative = installPlatform === 'linux'
    const additionalInfo = isLinuxNative
      ? await GOGLibrary.getLinuxInstallerInfo(this.appName)
      : null
    const installedData: InstalledInfo = {
      platform: installPlatform,
      executable: '',
      install_path: join(path, gameInfo.folder_name),
      install_size: size(installInfo.manifest.disk_size),
      is_dlc: false,
      version: additionalInfo
        ? additionalInfo.version
        : installInfo.game.version,
      appName: this.appName,
      installedWithDLCs: installDlcs,
      language: installLanguage,
      versionEtag: isLinuxNative ? '' : installInfo.manifest.versionEtag,
      buildId: isLinuxNative ? '' : installInfo.game.buildId
    }
    const array: Array<InstalledInfo> =
      (installedGamesStore.get('installed') as Array<InstalledInfo>) || []
    array.push(installedData)
    installedGamesStore.set('installed', array)
    GOGLibrary.get().refreshInstalled()
    if (isWindows) {
      logInfo(
        'Windows os, running setup instructions on install',
        LogPrefix.Gog
      )
      await setup(this.appName, installedData)
    }
    return { status: 'done' }
  }

  public async addShortcuts(fromMenu?: boolean) {
    return addShortcuts(await this.getGameInfo(), fromMenu)
  }

  public async removeShortcuts() {
    return removeShortcuts(this.appName, 'gog')
  }
  async launch(launchArguments?: string): Promise<LaunchResult> {
    const gameSettings =
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    const gameInfo = GOGLibrary.get().getGameInfo(this.appName)

    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      rpcClient,
      mangoHudCommand,
      gameModeBin,
      steamRuntime
    } = await prepareLaunch(this, gameInfo)
    if (!launchPrepSuccess) {
      return {
        success: false,
        stdout: '',
        stderr: 'Launch aborted: ' + launchPrepFailReason,
        gameSettings
      }
    }

    const exeOverrideFlag = gameSettings.targetExe
      ? ['--override-exe', gameSettings.targetExe]
      : []

    const isNative =
      isWindows ||
      (isMac && gameInfo.is_mac_native) ||
      (isLinux && gameInfo.is_linux_native)

    let commandParts = new Array<string>()
    let commandEnv = {}
    let wrappers = new Array<string>()
    if (isNative) {
      if (!isWindows) {
        // These options can only be used on Mac/Linux
        commandEnv = {
          ...commandEnv,
          ...setupEnvVars(gameSettings)
        }
        wrappers = setupWrappers(
          gameSettings,
          mangoHudCommand,
          gameModeBin,
          steamRuntime
        )
      }
      commandParts = [
        'launch',
        gameInfo.install.install_path,
        ...exeOverrideFlag,
        gameInfo.app_name,
        '--platform',
        `${gameInfo.install.platform}`,
        launchArguments,
        gameSettings.launcherArgs
      ]
    } else {
      const {
        success: wineLaunchPrepSuccess,
        failureReason: wineLaunchPrepFailReason,
        envVars: wineEnvVars
      } = await prepareWineLaunch(this)
      if (!wineLaunchPrepSuccess) {
        return {
          success: false,
          stdout: '',
          stderr: 'Launch aborted: ' + wineLaunchPrepFailReason,
          gameSettings
        }
      }

      commandEnv = {
        ...commandEnv,
        ...setupEnvVars(gameSettings),
        ...wineEnvVars
      }
      wrappers = setupWrappers(
        gameSettings,
        mangoHudCommand,
        gameModeBin,
        steamRuntime
      )

      const { wineVersion, winePrefix, launcherArgs } = gameSettings
      let wineFlag = ['--wine', wineVersion.bin]
      let winePrefixFlag = ['--wine-prefix', winePrefix]
      if (wineVersion.type === 'proton') {
        wineFlag = ['--no-wine', '--wrapper', `${wineVersion.bin} run`]
        winePrefixFlag = []
      }

      commandParts = [
        'launch',
        gameInfo.install.install_path,
        ...exeOverrideFlag,
        gameInfo.app_name,
        ...wineFlag,
        ...winePrefixFlag,
        '--os',
        gameInfo.install.platform.toLowerCase(),
        launchArguments,
        launcherArgs
      ]
    }
    const command = getGogdlCommand(commandParts, commandEnv, wrappers)

    logInfo([`Launching ${gameInfo.title}:`, command], LogPrefix.Gog)

    const { error, stderr, stdout } = await runGogdlCommand(commandParts, {
      env: commandEnv,
      wrappers
    })

    if (error) {
      logError(['Error launching game:', error], LogPrefix.Gog)
    }

    launchCleanup(rpcClient)

    return {
      success: !error,
      stdout,
      stderr,
      gameSettings,
      command
    }
  }

  public async moveInstall(newInstallPath: string): Promise<string> {
    const {
      install: { install_path },
      title
    } = await this.getGameInfo()

    if (isWindows) {
      newInstallPath += '\\' + install_path.split('\\').slice(-1)[0]
    } else {
      newInstallPath += '/' + install_path.split('/').slice(-1)[0]
    }

    logInfo(`Moving ${title} to ${newInstallPath}`, LogPrefix.Gog)
    await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
      .then(() => {
        GOGLibrary.get().changeGameInstallPath(this.appName, newInstallPath)
        logInfo(`Finished Moving ${title}`, LogPrefix.Gog)
      })
      .catch((error) => logError(`${error}`, LogPrefix.Gog))
    return newInstallPath
  }

  /**
   * Literally installing game, since gogdl verifies files at runtime
   */
  public async repair(): Promise<ExecResult> {
    const {
      installPlatform,
      gameData,
      credentials,
      withDlcs,
      logPath,
      workers
    } = await this.getCommandParameters()

    const commandParts = [
      'repair',
      this.appName,
      '--platform',
      installPlatform,
      `--path=${gameData.install.install_path}`,
      '--token',
      `"${credentials.access_token}"`,
      withDlcs,
      `--lang=${gameData.install.language || 'en-US'}`,
      '-b=' + gameData.install.buildId,
      ...workers
    ]
    const command = getGogdlCommand(commandParts)

    logInfo([`Repairing ${this.appName} with:`, command], LogPrefix.Gog)

    const res = await runGogdlCommand(commandParts, { logFile: logPath })

    if (res.error) {
      logError(
        ['Failed to repair', `${this.appName}:`, res.error],
        LogPrefix.Gog
      )
    }

    return res
  }

  public async stop(): Promise<void> {
    const pattern = isLinux ? this.appName : 'gogdl'
    logInfo(['killing', pattern], LogPrefix.Gog)

    if (isWindows) {
      try {
        await execAsync(`Stop-Process -name  ${pattern}`, execOptions)
        return logInfo(`${pattern} killed`, LogPrefix.Gog)
      } catch (error) {
        return logError(
          [`not possible to kill ${pattern}`, `${error}`],
          LogPrefix.Gog
        )
      }
    }

    const child = spawn('pkill', ['-f', pattern])
    child.on('exit', () => {
      return logInfo(`${pattern} killed`, LogPrefix.Gog)
    })
  }

  async syncSaves(arg: string, path: string): Promise<ExecResult> {
    throw new Error(
      "GOG integration doesn't support syncSaves yet. How did you managed to call that function?"
    )
  }
  public async uninstall(): Promise<ExecResult> {
    const array: Array<InstalledInfo> =
      (installedGamesStore.get('installed') as Array<InstalledInfo>) || []
    const index = array.findIndex((game) => game.appName === this.appName)
    if (index === -1) {
      throw Error("Game isn't installed")
    }

    const [object] = array.splice(index, 1)
    logInfo(['Removing', object.install_path], LogPrefix.Gog)
    // TODO: Run unins000.exe /verysilent /dir=Z:/path/to/game
    const uninstallerPath = join(object.install_path, 'unins000.exe')

    const res: ExecResult = { stdout: '', stderr: '' }
    if (existsSync(uninstallerPath)) {
      const {
        winePrefix,
        wineVersion: { bin, name },
        wineCrossoverBottle
      } = GameConfig.get(this.appName).config
      let commandPrefix = `WINEPREFIX="${winePrefix}" ${bin}`
      if (name.includes('CrossOver')) {
        commandPrefix = `CX_BOTTLE=${wineCrossoverBottle} ${bin}`
      }
      const command = `${
        isWindows ? '' : commandPrefix
      } "${uninstallerPath}" /verysilent /dir="${isWindows ? '' : 'Z:'}${
        object.install_path
      }"`
      logInfo(['Executing uninstall command', command], LogPrefix.Gog)
      execAsync(command)
        .then(({ stdout, stderr }) => {
          res.stdout = stdout
          res.stderr = stderr
        })
        .catch((error) => {
          res.error = error
        })
    } else {
      rmSync(object.install_path, { recursive: true })
    }
    installedGamesStore.set('installed', array)
    GOGLibrary.get().refreshInstalled()
    removeShortcuts(this.appName, 'gog')
    return res
  }

  public async update(): Promise<{ status: 'done' | 'error' }> {
    const {
      installPlatform,
      gameData,
      credentials,
      withDlcs,
      logPath,
      workers
    } = await this.getCommandParameters()
    const commandParts = [
      'update',
      this.appName,
      '--platform',
      installPlatform,
      `--path=${gameData.install.install_path}`,
      '--token',
      `"${credentials.access_token}"`,
      withDlcs,
      `--lang=${gameData.install.language || 'en-US'}`,
      ...workers
    ]
    const command = getGogdlCommand(commandParts)

    logInfo([`Updating ${this.appName} with:`, command], LogPrefix.Gog)

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput('updating', data)
    }

    const res = await runGogdlCommand(commandParts, {
      logFile: logPath,
      onOutput
    })

    // This always has to be done, so we do it before checking for res.error
    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      runner: 'gog',
      status: 'done'
    })

    if (res.error) {
      logError(
        ['Failed to update', `${this.appName}:`, res.error],
        LogPrefix.Gog
      )
      return { status: 'error' }
    }

    const installedArray = installedGamesStore.get(
      'installed'
    ) as InstalledInfo[]
    const gameIndex = installedArray.findIndex(
      (value) => this.appName === value.appName
    )
    const gameObject = installedArray[gameIndex]

    if (gameData.install.platform !== 'linux') {
      const installInfo = await GOGLibrary.get().getInstallInfo(this.appName)
      gameObject.buildId = installInfo.game.buildId
      gameObject.version = installInfo.game.version
      gameObject.versionEtag = installInfo.manifest.versionEtag
      gameObject.install_size = size(installInfo.manifest.disk_size)
    } else {
      const installerInfo = await GOGLibrary.getLinuxInstallerInfo(this.appName)
      gameObject.version = installerInfo.version
    }
    installedGamesStore.set('installed', installedArray)
    GOGLibrary.get().refreshInstalled()
    return { status: 'done' }
  }

  /**
   * Reads game installed data and returns proper parameters
   * Useful for Update and Repair
   */
  public async getCommandParameters() {
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const gameData = GOGLibrary.get().getGameInfo(this.appName)

    const withDlcs = gameData.install.installedWithDLCs
      ? '--with-dlcs'
      : '--skip-dlcs'
    if (GOGUser.isTokenExpired()) {
      await GOGUser.refreshToken()
    }
    const credentials = configStore.get('credentials') as GOGLoginData

    const installPlatform = gameData.install.platform
    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    return {
      withDlcs,
      workers,
      installPlatform,
      logPath,
      credentials,
      gameData
    }
  }

  public async runWineCommand(
    command: string,
    altWineBin = '',
    wait = false
  ): Promise<ExecResult> {
    const gameInfo = await this.getGameInfo()
    const isNative =
      isWindows ||
      (isMac && gameInfo.is_mac_native) ||
      (isLinux && gameInfo.is_linux_native)
    if (isNative) {
      logError('runWineCommand called on native game!', LogPrefix.Gog)
      return { stdout: '', stderr: '' }
    }

    return runWineCommand(await this.getSettings(), command, altWineBin, wait)
  }
}

export { GOGGame }
