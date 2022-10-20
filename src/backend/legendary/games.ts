import { appendFileSync, existsSync, mkdirSync } from 'graceful-fs'
import axios from 'axios'

import { BrowserWindow } from 'electron'
import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  InstallArgs,
  InstallPlatform
} from 'common/types'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import { LegendaryLibrary, runLegendaryCommand } from './library'
import { LegendaryUser } from './user'
import { execAsync, getLegendaryBin, killPattern } from '../utils'
import {
  heroicGamesConfigPath,
  userHome,
  isMac,
  isWindows,
  installed,
  configStore
} from '../constants'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import {
  prepareLaunch,
  prepareWineLaunch,
  setupEnvVars,
  runWineCommand,
  setupWrappers,
  launchCleanup,
  getRunnerCallWithoutCredentials
} from '../launcher'
import { addShortcuts, removeShortcuts } from '../shortcuts/shortcuts/shortcuts'
import { basename, join } from 'path'
import { gameInfoStore } from './electronStores'
import { removeNonSteamGame } from '../shortcuts/nonesteamgame/nonesteamgame'
import shlex from 'shlex'
import { t } from 'i18next'
import { isOnline } from '../online_monitor'
import { showDialogBoxModalAuto } from '../dialog/dialog'

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
    return LegendaryGame.instances.get(appName) as LegendaryGame
  }

  /**
   * Alias for `LegendaryLibrary.listUpdateableGames`
   */
  public static async checkGameUpdates() {
    const isLoggedIn = LegendaryUser.isLoggedIn()
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
  public getGameInfo(): GameInfo {
    const info = LegendaryLibrary.get().getGameInfo(this.appName)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.appName},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        { prefix: LogPrefix.Legendary }
      )
      // @ts-expect-error TODO: Handle this better
      return {}
    }
    return info
  }

  /**
   * Alias for `LegendaryLibrary.getInstallInfo(this.appName)`
   *
   * @returns InstallInfo
   */
  public async getInstallInfo(installPlatform: InstallPlatform) {
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
  public async getExtraInfo(): Promise<ExtraInfo> {
    const { namespace } = this.getGameInfo()
    if (gameInfoStore.has(namespace)) {
      return gameInfoStore.get(namespace) as ExtraInfo
    }
    if (!isOnline()) {
      return {
        about: {
          description: '',
          longDescription: ''
        },
        reqs: []
      }
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
        logError(error, { prefix: LogPrefix.Legendary })
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
      logInfo('Getting Info from Epic API', { prefix: LogPrefix.Legendary })

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
      }
    } catch (error) {
      logError('Error Getting Info from Epic API', {
        prefix: LogPrefix.Legendary
      })

      gameInfoStore.set(namespace, { about: {}, reqs: [] })
      return {
        about: {
          description: '',
          longDescription: ''
        },
        reqs: []
      }
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
   * Helper for `listUpdateableGames().includes(this.appName)`
   *
   * @returns If game has an update.
   */
  public async hasUpdate() {
    const allUpdateableGames =
      await LegendaryLibrary.get().listUpdateableGames()
    return allUpdateableGames.includes(this.appName)
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   *
   * @param newInstallPath
   * @returns The amended install path.
   */
  public async moveInstall(newInstallPath: string) {
    const oldInstallPath = this.getGameInfo().install.install_path!

    newInstallPath = join(newInstallPath, basename(oldInstallPath))

    const command = `mv -f '${oldInstallPath}' '${newInstallPath}'`

    logInfo([`Moving ${this.appName} to ${newInstallPath} with`, command], {
      prefix: LogPrefix.Legendary
    })

    await execAsync(command)
      .then(async () => {
        await LegendaryLibrary.get().changeGameInstallPath(
          this.appName,
          newInstallPath
        )
      })
      .catch((error) => {
        logError([`Failed to move ${this.appName}:`, error], {
          prefix: LogPrefix.Legendary
        })
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
    if (!etaMatch || !bytesMatch) {
      return
    }

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
      { prefix: LogPrefix.Legendary }
    )

    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      runner: 'legendary',
      status: action,
      progress: {
        eta: eta,
        percent,
        bytes: `${bytes}MiB`
      }
    })
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
    const { maxWorkers, downloadNoHttps } =
      await GlobalConfig.get().getSettings()
    const installPlatform = this.getGameInfo().install.platform!
    const info = await this.getInstallInfo(installPlatform)
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const noHttps = downloadNoHttps ? ['--no-https'] : []
    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = ['update', this.appName, ...workers, ...noHttps, '-y']

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'installing',
        info.manifest.download_size,
        data
      )
    }

    const res = await runLegendaryCommand(commandParts, {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Updating ${this.appName}`
    })

    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      runner: 'legendary',
      status: 'done'
    })

    if (res.error) {
      logError(['Failed to update', `${this.appName}:`, res.error], {
        prefix: LogPrefix.Legendary
      })
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
    return addShortcuts(this.getGameInfo(), fromMenu)
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
    return [
      // Legendary needs an empty tag for it to download the other needed files
      '--install-tag=',
      ...sdlList.map((tag) => `--install-tag=${tag}`)
    ]
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
    const { maxWorkers, downloadNoHttps } =
      await GlobalConfig.get().getSettings()
    const info = await this.getInstallInfo(platformToInstall)
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const noHttps = downloadNoHttps ? ['--no-https'] : []
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    const installSdl = sdlList.length
      ? this.getSdlList(sdlList)
      : ['--skip-sdl']

    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = [
      'install',
      this.appName,
      '--platform',
      platformToInstall,
      '--base-path',
      path,
      withDlcs,
      ...installSdl,
      ...workers,
      ...noHttps,
      '-y'
    ]

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'updating',
        info.manifest.download_size,
        data
      )
    }

    let res = await runLegendaryCommand(commandParts, {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Installing ${this.appName}`
    })

    // try to run the install again with higher memory limit
    if (res.stderr.includes('MemoryError:')) {
      res = await runLegendaryCommand(
        [...commandParts, '--max-shared-memory', '5000'],
        {
          logFile: logPath,
          onOutput
        }
      )
    }

    if (res.error) {
      if (!res.error.includes('signal')) {
        logError(['Failed to install', `${this.appName}:`, res.error], {
          prefix: LogPrefix.Legendary
        })
      }
      return { status: 'error' }
    }
    return { status: 'done' }
  }

  public async uninstall(): Promise<ExecResult> {
    const commandParts = ['uninstall', this.appName, '-y']

    const res = await runLegendaryCommand(commandParts, {
      logMessagePrefix: `Uninstalling ${this.appName}`
    })

    if (res.error) {
      logError(['Failed to uninstall', `${this.appName}:`, res.error], {
        prefix: LogPrefix.Legendary
      })
    } else {
      LegendaryLibrary.get().installState(this.appName, false)
      await removeShortcuts(this.appName, 'legendary')
      const gameInfo = this.getGameInfo()
      const { defaultSteamPath } = await GlobalConfig.get().getSettings()
      const steamUserdataDir = join(
        defaultSteamPath.replaceAll("'", ''),
        'userdata'
      )
      await removeNonSteamGame({ steamUserdataDir, gameInfo })
    }
    return res
  }
  /**
   * Repair game.
   * Does NOT check for online connectivity.
   */
  public async repair(): Promise<ExecResult> {
    // this.state.status = 'repairing'
    const { maxWorkers, downloadNoHttps } =
      await GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const noHttps = downloadNoHttps ? ['--no-https'] : []

    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = ['repair', this.appName, ...workers, ...noHttps, '-y']

    const res = await runLegendaryCommand(commandParts, {
      logFile: logPath,
      logMessagePrefix: `Repairing ${this.appName}`
    })

    if (res.error) {
      logError(['Failed to repair', `${this.appName}:`, res.error], {
        prefix: LogPrefix.Legendary
      })
    }
    return res
  }

  public async import(path: string): Promise<ExecResult> {
    const commandParts = ['import', this.appName, path]

    logInfo(`Importing ${this.appName}.`, { prefix: LogPrefix.Legendary })

    const res = await runLegendaryCommand(commandParts)

    if (res.error) {
      logError(['Failed to import', `${this.appName}:`, res.error], {
        prefix: LogPrefix.Legendary
      })
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

    const res = await runLegendaryCommand(commandParts, {
      logMessagePrefix: `Syncing saves for ${this.appName}`
    })

    if (res.error) {
      logError(['Failed to sync saves for', `${this.appName}:`, res.error], {
        prefix: LogPrefix.Legendary
      })
    }
    return res
  }

  public async launch(launchArguments: string): Promise<boolean> {
    const gameSettings = await this.getSettings()
    const gameInfo = this.getGameInfo()

    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      rpcClient,
      mangoHudCommand,
      gameModeBin,
      steamRuntime,
      offlineMode
    } = await prepareLaunch(this, gameInfo)
    if (!launchPrepSuccess) {
      appendFileSync(
        this.logFileLocation,
        `Launch aborted: ${launchPrepFailReason}`
      )
      showDialogBoxModalAuto({
        title: t('box.error.launchAborted', 'Launch aborted'),
        message: launchPrepFailReason!,
        type: 'ERROR'
      })
      return false
    }

    const offlineFlag = offlineMode ? '--offline' : ''
    const exeOverrideFlag = gameSettings.targetExe
      ? ['--override-exe', gameSettings.targetExe]
      : []

    const languageCode =
      gameSettings.language || (configStore.get('language', '') as string)
    const languageFlag = languageCode ? ['--language', languageCode] : []

    let commandEnv = isWindows
      ? process.env
      : { ...process.env, ...setupEnvVars(gameSettings) }
    const wineFlag: string[] = []
    if (!this.isNative()) {
      // -> We're using Wine/Proton on Linux or CX on Mac
      const {
        success: wineLaunchPrepSuccess,
        failureReason: wineLaunchPrepFailReason,
        envVars: wineEnvVars
      } = await prepareWineLaunch(this)
      if (!wineLaunchPrepSuccess) {
        appendFileSync(
          this.logFileLocation,
          `Launch aborted: ${wineLaunchPrepFailReason}`
        )
        showDialogBoxModalAuto({
          title: t('box.error.launchAborted', 'Launch aborted'),
          message: wineLaunchPrepFailReason!,
          type: 'ERROR'
        })
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

      wineFlag.push(
        ...(wineType === 'proton'
          ? ['--no-wine', '--wrapper', `'${wineBin}' run`]
          : ['--wine', wineBin])
      )
    }
    const commandParts = [
      'launch',
      this.appName,
      ...languageFlag,
      ...exeOverrideFlag,
      ...offlineFlag,
      ...wineFlag,
      ...shlex.split(launchArguments ?? ''),
      ...shlex.split(gameSettings.launcherArgs ?? '')
    ]
    const wrappers = setupWrappers(
      gameSettings,
      mangoHudCommand,
      gameModeBin,
      steamRuntime?.length
        ? [...steamRuntime, `--filesystem=${gameInfo.install.install_path}`]
        : undefined
    )

    const fullCommand = getRunnerCallWithoutCredentials(
      commandParts,
      commandEnv,
      wrappers,
      join(...Object.values(getLegendaryBin()))
    )
    appendFileSync(
      this.logFileLocation,
      `Launch Command: ${fullCommand}\n\nGame Log:\n`
    )

    const { error } = await runLegendaryCommand(commandParts, {
      env: commandEnv,
      wrappers: wrappers,
      logMessagePrefix: `Launching ${gameInfo.title}`,
      onOutput: (output) => {
        appendFileSync(this.logFileLocation, output)
      }
    })

    if (error) {
      const showDialog = !`${error}`.includes('appears to be deleted')
      logError(['Error launching game:', error], {
        prefix: LogPrefix.Legendary,
        showDialog
      })
    }

    launchCleanup(rpcClient)

    return !error
  }

  public async runWineCommand(
    command: string,
    wait = false,
    forceRunInPrefixVerb = false
  ): Promise<ExecResult> {
    if (this.isNative()) {
      logError('runWineCommand called on native game!', {
        prefix: LogPrefix.Legendary
      })
      return { stdout: '', stderr: '' }
    }

    return runWineCommand(this, command, wait, forceRunInPrefixVerb)
  }

  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    const pattern = process.platform === 'linux' ? this.appName : 'legendary'
    killPattern(pattern)
  }

  public isNative(): boolean {
    const gameInfo = this.getGameInfo()

    if (isWindows) {
      return true
    }

    if (isMac && gameInfo?.install?.platform === 'Mac') {
      return true
    }

    return false
  }

  public async forceUninstall() {
    // Modify Legendary installed.json file:
    try {
      await runLegendaryCommand([
        'uninstall',
        this.appName,
        '-y',
        '--keep-files'
      ])
      const mainWindow =
        BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      mainWindow.webContents.send('refreshLibrary', 'legendary')
    } catch (error) {
      logError(`Error reading ${installed}, could not complete operation`, {
        prefix: LogPrefix.Legendary
      })
    }
  }
}

export { LegendaryGame }
