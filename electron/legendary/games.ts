import { existsSync, mkdirSync } from 'graceful-fs'
import axios from 'axios'

import { BrowserWindow } from 'electron'
import { ExecResult, ExtraInfo, InstallArgs, LaunchResult } from '../types'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import { getLegendaryCommand, LegendaryLibrary } from './library'
import { LegendaryUser } from './user'
import { execAsync, getSteamRuntime, isOnline } from '../utils'
import {
  execOptions,
  heroicGamesConfigPath,
  userHome,
  isLinux,
  isMac,
  isWindows
} from '../constants'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { spawn } from 'child_process'
import {
  prepareLaunch,
  prepareWineLaunch,
  setupEnvVars,
  runWineCommand,
  setupWrappers,
  launchCleanup
} from '../launcher'
import { addShortcuts, removeShortcuts } from '../shortcuts'
import { basename, join } from 'path'
import { runLegendaryCommand } from './library'
import { gameInfoStore } from './electronStores'

class LegendaryGame extends Game {
  public appName: string
  public window = BrowserWindow.getAllWindows()[0]
  private static instances: Map<string, LegendaryGame> = new Map()

  private constructor(appName: string) {
    super()
    this.appName = appName
  }

  public static get(appName: string) {
    if (LegendaryGame.instances.get(appName) === undefined) {
      LegendaryGame.instances.set(appName, new LegendaryGame(appName))
    }
    return LegendaryGame.instances.get(appName)
  }

  /**
   * Alias for `LegendaryLibrary.listUpdateableGames`
   */
  public static async checkGameUpdates() {
    const isLoggedIn = await LegendaryUser.isLoggedIn()
    if (!isLoggedIn) {
      return []
    }
    return LegendaryLibrary.get().listUpdateableGames()
  }

  /**
   * Alias for `LegendaryLibrary.getGameInfo(this.appName)`
   *
   * @returns GameInfo
   */
  public async getGameInfo() {
    return LegendaryLibrary.get().getGameInfo(this.appName)
  }

  /**
   * Alias for `LegendaryLibrary.getInstallInfo(this.appName)`
   *
   * @returns InstallInfo
   */
  public async getInstallInfo(installPlatform?: string) {
    return LegendaryLibrary.get().getInstallInfo(this.appName, installPlatform)
  }

  private async getProductSlug(namespace: string) {
    const graphql = JSON.stringify({
      query: `{Catalog{catalogOffers( namespace:"${namespace}"){elements {productSlug}}}}`,
      variables: {}
    })
    const result = await axios('https://www.epicgames.com/graphql', {
      data: graphql,
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    const res = result.data.data.Catalog.catalogOffers
    const slug = res.elements.find(
      (e: { productSlug: string }) => e.productSlug
    )
    if (slug) {
      return slug.productSlug.replace(/(\/.*)/, '')
    } else {
      return this.appName
    }
  }

  /**
   * Get extra info from Epic's API.
   *
   * @param namespace
   * @returns
   */
  public async getExtraInfo(namespace: string | null): Promise<ExtraInfo> {
    if (gameInfoStore.has(namespace)) {
      return gameInfoStore.get(namespace) as ExtraInfo
    }
    if (!isOnline()) {
      return {
        about: {},
        reqs: []
      } as ExtraInfo
    }
    let lang = GlobalConfig.get().config.language
    if (lang === 'pt') {
      lang = 'pt-BR'
    }
    if (lang === 'zh_Hans') {
      lang = 'zh-CN'
    }

    let epicUrl: string
    if (namespace) {
      let productSlug: string
      try {
        productSlug = await this.getProductSlug(namespace)
      } catch (error) {
        logError(`${error}`, LogPrefix.Legendary)
        productSlug = this.appName
      }
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${productSlug}`
    } else {
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${this.appName}`
    }
    try {
      const { data } = await axios({
        method: 'GET',
        url: epicUrl
      })
      logInfo('Getting Info from Epic API', LogPrefix.Legendary)

      const about = data.pages.find(
        (e: { type: string }) => e.type === 'productHome'
      )

      gameInfoStore.set(namespace, {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      })
      return {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      } as ExtraInfo
    } catch (error) {
      logError('Error Getting Info from Epic API', LogPrefix.Legendary)

      gameInfoStore.set(namespace, { about: {}, reqs: [] })
      return {
        about: {},
        reqs: []
      } as ExtraInfo
    }
  }

  /**
   * Alias for `GameConfig.get(this.appName).config`
   * If it doesn't exist, uses getSettings() instead.
   *
   * @returns GameConfig
   */
  public async getSettings() {
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }

  /**
   * Helper for `checkGameUpdates().contains(this.appName)`
   *
   * @returns If game has an update.
   */
  public async hasUpdate() {
    return (await LegendaryLibrary.get().listUpdateableGames()).includes(
      this.appName
    )
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   *
   * @param newInstallPath
   * @returns The amended install path.
   */
  public async moveInstall(newInstallPath: string) {
    const oldInstallPath = (await this.getGameInfo()).install.install_path

    newInstallPath = join(newInstallPath, basename(oldInstallPath))

    const command = `mv -f '${oldInstallPath}' '${newInstallPath}'`

    logInfo(
      [`Moving ${this.appName} to ${newInstallPath} with`, command],
      LogPrefix.Legendary
    )

    await execAsync(command)
      .then(() => {
        LegendaryLibrary.get().changeGameInstallPath(
          this.appName,
          newInstallPath
        )
      })
      .catch((error) => {
        logError(
          `Failed to move ${this.appName}: ${error}`,
          LogPrefix.Legendary
        )
      })
    return newInstallPath
  }

  // used when downloading games, store the download size read from Legendary's output
  currentDownloadSize = 0

  public onInstallOrUpdateOutput(
    action: 'installing' | 'updating',
    totalDownloadSize: number,
    data: string
  ) {
    const downloadSizeMatch = data.match(/Download size: ([\d.]+) MiB/)

    // store the download size, needed for correct calculation
    // when cancel/resume downloads
    if (downloadSizeMatch) {
      this.currentDownloadSize = parseFloat(downloadSizeMatch[1])
    }

    // parse log for game download progress
    const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
    const bytesMatch = data.match(/Downloaded: (\S+.) MiB/m)
    if (etaMatch && bytesMatch) {
      const eta = etaMatch[1]
      const bytes = bytesMatch[1]

      // original is in bytes, convert to MiB with 2 decimals
      totalDownloadSize =
        Math.round((totalDownloadSize / 1024 / 1024) * 100) / 100

      // calculate percentage
      const downloaded = parseFloat(bytes)
      const downloadCache = totalDownloadSize - this.currentDownloadSize
      const totalDownloaded = downloaded + downloadCache
      let percent =
        Math.round((totalDownloaded / totalDownloadSize) * 10000) / 100
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
        runner: 'legendary',
        status: action,
        progress: {
          eta: eta,
          percent: `${percent.toFixed(0)}%`,
          bytes: `${bytes}MiB`
        }
      })
    }
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   */
  public async update(): Promise<{ status: 'done' | 'error' }> {
    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      runner: 'legendary',
      status: 'updating'
    })
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const info = await Game.get(this.appName, 'legendary').getInstallInfo()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = ['update', this.appName, ...workers, '-y']
    const command = getLegendaryCommand(commandParts)

    logInfo([`Updating ${this.appName} with:`, command], LogPrefix.Legendary)

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'installing',
        info.manifest.download_size,
        data
      )
    }

    const res = await runLegendaryCommand(commandParts, {
      logFile: logPath,
      onOutput
    })

    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      runner: 'legendary',
      status: 'done'
    })

    if (res.error) {
      logError(
        ['Failed to update', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
      return { status: 'error' }
    }
    return { status: 'done' }
  }

  /**
   * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
   * so that the game can be opened from the start menu and the desktop folder.
   * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
   * @async
   * @public
   */
  public async addShortcuts(fromMenu?: boolean) {
    return addShortcuts(await this.getGameInfo(), fromMenu)
  }

  /**
   * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
   * @async
   * @public
   */
  public async removeShortcuts() {
    return removeShortcuts(this.appName, 'legendary')
  }

  private getSdlList(sdlList: Array<string>) {
    // Legendary needs an empty tag for it to download the other needed files
    const defaultTag = ' --install-tag=""'
    return sdlList
      .map((tag) => `--install-tag ${tag}`)
      .join(' ')
      .replaceAll("'", '')
      .concat(defaultTag)
  }

  /**
   * Install game.
   * Does NOT check for online connectivity.
   */
  public async install({
    path,
    installDlcs,
    sdlList,
    platformToInstall
  }: InstallArgs): Promise<{ status: 'done' | 'error' }> {
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const info = await Game.get(this.appName, 'legendary').getInstallInfo(
      platformToInstall
    )
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    const installSdl = sdlList.length ? this.getSdlList(sdlList) : '--skip-sdl'

    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = [
      'install',
      this.appName,
      '--platform',
      platformToInstall,
      '--base-path',
      path,
      withDlcs,
      installSdl,
      ...workers,
      '-y'
    ]
    const command = getLegendaryCommand(commandParts)
    logInfo([`Installing ${this.appName} with:`, command], LogPrefix.Legendary)

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'updating',
        info.manifest.download_size,
        data
      )
    }

    const res = await runLegendaryCommand(commandParts, {
      logFile: logPath,
      onOutput
    })

    if (res.error) {
      logError(
        ['Failed to install', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
      return { status: 'error' }
    }
    return { status: 'done' }
  }

  public async uninstall(): Promise<ExecResult> {
    const commandParts = ['uninstall', this.appName, '-y']
    const command = getLegendaryCommand(commandParts)

    logInfo([`Uninstalling ${this.appName}:`, command], LogPrefix.Legendary)

    LegendaryLibrary.get().installState(this.appName, false)
    const res = await runLegendaryCommand(commandParts)

    if (res.error) {
      logError(
        ['Failed to uninstall', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    } else {
      removeShortcuts(this.appName, 'legendary')
    }
    return res
  }
  /**
   * Repair game.
   * Does NOT check for online connectivity.
   */
  public async repair(): Promise<ExecResult> {
    // this.state.status = 'repairing'
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []

    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = ['repair', this.appName, ...workers, '-y']
    const command = getLegendaryCommand(commandParts)

    logInfo([`Repairing ${this.appName}:`, command], LogPrefix.Legendary)

    const res = await runLegendaryCommand(commandParts, { logFile: logPath })

    if (res.error) {
      logError(
        ['Failed to repair', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return res
  }

  public async import(path: string): Promise<ExecResult> {
    const commandParts = ['import', this.appName, path]
    const command = getLegendaryCommand(commandParts)

    logInfo([`Importing ${this.appName}:`, command], LogPrefix.Legendary)

    const res = await runLegendaryCommand(commandParts)

    if (res.error) {
      logError(
        ['Failed to import', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return res
  }

  /**
   * Sync saves.
   * Does NOT check for online connectivity.
   */
  public async syncSaves(arg: string, path: string) {
    path = path.replaceAll("'", '').replaceAll('"', '')
    const fixedPath = isWindows ? path.slice(0, -1) : path

    // workaround error when no .saves folder exists
    const legendarySavesPath = join(userHome, 'legendary', '.saves')
    if (!existsSync(legendarySavesPath)) {
      mkdirSync(legendarySavesPath, { recursive: true })
    }

    const commandParts = [
      'sync-saves',
      arg,
      '--save-path',
      fixedPath,
      this.appName,
      '-y'
    ]
    const command = getLegendaryCommand(commandParts)

    logInfo(
      [`Syncing saves for ${this.appName}:`, command],
      LogPrefix.Legendary
    )

    const res = await runLegendaryCommand(commandParts)

    if (res.error) {
      logError(
        ['Failed to sync saves for', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return res
  }

  public async launch(launchArguments = ''): Promise<LaunchResult> {
    const gameSettings =
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    const gameInfo = LegendaryLibrary.get().getGameInfo(this.appName)

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

    const offlineFlag = gameSettings.offlineMode ? '--offline' : ''
    const exeOverrideFlag = gameSettings.targetExe
      ? ['--override-exe', gameSettings.targetExe]
      : []

    const isNative =
      isWindows ||
      (isMac && gameInfo.is_mac_native) ||
      // This right now is impossible, but one can still hope, right?
      (isLinux && gameInfo.is_linux_native)

    let commandParts = new Array<string>()
    let commandEnv = process.env
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
      // These options are required on both Windows and Mac
      commandParts = [
        'launch',
        gameInfo.app_name,
        ...exeOverrideFlag,
        offlineFlag,
        launchArguments
      ]
    } else {
      // -> We're using Wine/Proton/CX on either Linux or Mac
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
        const runtime = getSteamRuntime()
        const runWithRuntime = runtime.path
          ? `${runtime.path} -- '${wineVersion.bin}' waitforexitandrun`
          : `'${wineVersion.bin}' run`
        wineFlag = ['--no-wine', '--wrapper', runWithRuntime]
        winePrefixFlag = []
      }

      commandParts = [
        'launch',
        gameInfo.app_name,
        ...exeOverrideFlag,
        offlineFlag,
        ...wineFlag,
        ...winePrefixFlag,
        launcherArgs
      ]
    }
    const command = getLegendaryCommand(commandParts, commandEnv, wrappers)

    logInfo([`Launching ${gameInfo.title}:`, command], LogPrefix.Legendary)
    const { error, stderr, stdout } = await runLegendaryCommand(commandParts, {
      env: commandEnv,
      wrappers: wrappers
    })

    if (error) {
      logError(['Error launching game:', error], LogPrefix.Legendary)
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
      logError('runWineCommand called on native game!', LogPrefix.Legendary)
      return { stdout: '', stderr: '' }
    }

    return runWineCommand(await this.getSettings(), command, altWineBin, wait)
  }

  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    const pattern = process.platform === 'linux' ? this.appName : 'legendary'
    logInfo(['killing', pattern], LogPrefix.Legendary)

    if (process.platform === 'win32') {
      try {
        await execAsync(`Stop-Process -name  ${pattern}`, execOptions)
        return logInfo(`${pattern} killed`, LogPrefix.Legendary)
      } catch (error) {
        return logError(
          [`not possible to kill ${pattern}`, `${error}`],
          LogPrefix.Legendary
        )
      }
    }

    const child = spawn('pkill', ['-f', pattern])
    child.on('exit', () => {
      return logInfo(`${pattern} killed`, LogPrefix.Legendary)
    })
  }
}

export { LegendaryGame }
