import {
  createAbortController,
  deleteAbortController
} from '../utils/aborthandler/aborthandler'
import { appendFileSync } from 'graceful-fs'
import axios from 'axios'

import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  InstallArgs,
  InstallPlatform,
  Runner,
  InstallProgress,
  WineCommandArgs
} from 'common/types'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import { LegendaryLibrary, runLegendaryCommand } from './library'
import { LegendaryUser } from './user'
import {
  getLegendaryBin,
  killPattern,
  moveOnUnix,
  moveOnWindows,
  shutdownWine
} from '../utils'
import {
  heroicGamesConfigPath,
  isMac,
  isWindows,
  installed,
  configStore,
  isLinux,
  isFlatpak,
  isCLINoGui
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
import { join } from 'path'
import { gameInfoStore } from './electronStores'
import { removeNonSteamGame } from '../shortcuts/nonesteamgame/nonesteamgame'
import shlex from 'shlex'
import { t } from 'i18next'
import { isOnline } from '../online_monitor'
import { showDialogBoxModalAuto } from '../dialog/dialog'
import { gameAnticheatInfo } from '../anticheat/utils'
import { Catalog, Product } from 'common/types/epic-graphql'
import { sendFrontendMessage } from '../main_window'

class LegendaryGame extends Game {
  public appName: string
  public runner: Runner
  private static instances: Map<string, LegendaryGame> = new Map()

  private constructor(appName: string) {
    super()
    this.appName = appName
    this.runner = 'legendary'
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
        LogPrefix.Legendary
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

  private async getProductSlug(namespace: string, title: string) {
    // If you want to change this graphql query, make sure it works for these games:
    // Rocket League
    // Alba - A Wildlife Adventure
    const graphql = {
      query: `{
          Catalog {
            catalogNs(namespace: "${namespace}") {
              mappings (pageType: "productHome") {
                pageSlug
                pageType
              }
            }
          }
      }`
    }

    try {
      const result = await axios('https://www.epicgames.com/graphql', {
        data: graphql,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      })

      const res = result.data.data.Catalog as Catalog
      const slugMapping = res.catalogNs.mappings.find(
        (mapping) => mapping.pageType === 'productHome'
      )

      if (slugMapping) {
        return slugMapping.pageSlug
      } else {
        return this.slugFromTitle(title)
      }
    } catch (error) {
      logError(error, LogPrefix.Legendary)
      return this.slugFromTitle(title)
    }
  }

  private async getExtraFromAPI(slug: string): Promise<ExtraInfo | null> {
    let lang = configStore.get('language', '')
    if (lang === 'pt') {
      lang = 'pt-BR'
    }
    if (lang === 'zh_Hans') {
      lang = 'zh-CN'
    }

    const epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${slug}`

    try {
      const { data } = await axios({ method: 'GET', url: epicUrl })
      logInfo('Getting Info from Epic API', LogPrefix.Legendary)

      const about = data?.pages?.find(
        (e: { type: string }) => e.type === 'productHome'
      )

      if (about) {
        return {
          about: about.data.about,
          reqs: about.data.requirements.systems[0].details,
          storeUrl: `https://www.epicgames.com/store/product/${slug}`
        }
      } else {
        return null
      }
    } catch (error) {
      return null
    }
  }

  private async getExtraFromGraphql(
    namespace: string,
    slug: string
  ): Promise<ExtraInfo | null> {
    const graphql = {
      query: `{
        Product {
          sandbox(sandboxId: "${namespace}") {
            configuration {
              ... on StoreConfiguration {
                configs {
                  shortDescription
                  technicalRequirements {
                    macos {
                      minimum
                      recommended
                      title
                    }
                    windows {
                      minimum
                      recommended
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }`
    }

    try {
      const result = await axios('https://www.epicgames.com/graphql', {
        data: graphql,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      })

      const res = result.data.data.Product as Product

      const configuration = res.sandbox.configuration[0]

      if (!configuration) {
        return null
      }

      const requirements = configuration.configs.technicalRequirements.windows

      if (requirements) {
        return {
          about: {
            description: res.sandbox.configuration[0].configs.shortDescription,
            shortDescription: ''
          },
          reqs: requirements,
          storeUrl: `https://www.epicgames.com/store/product/${slug}`
        }
      } else {
        return null
      }
    } catch (error) {
      logError(error, LogPrefix.Legendary)
      return null
    }
  }

  private slugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z ]/g, '')
      .replaceAll(' ', '-')
  }

  /**
   * Get extra info from Epic's API.
   *
   */
  public async getExtraInfo(): Promise<ExtraInfo> {
    const { namespace, title } = this.getGameInfo()
    const cachedExtraInfo = gameInfoStore.get(namespace)
    if (cachedExtraInfo) {
      return cachedExtraInfo
    }
    if (!isOnline()) {
      return {
        about: {
          description: '',
          shortDescription: ''
        },
        reqs: [],
        storeUrl: ''
      }
    }

    const slug = await this.getProductSlug(namespace, title)

    // try the API first, it works for most games
    let extraData = await this.getExtraFromAPI(slug)

    // if the API doesn't work, try graphql
    if (!extraData) {
      extraData = await this.getExtraFromGraphql(namespace, slug)
    }

    // if we have data, store it and return
    if (extraData) {
      gameInfoStore.set(namespace, extraData)
      return extraData
    } else {
      logError('Error Getting Info from Epic API', LogPrefix.Legendary)
      return {
        about: {
          description: '',
          shortDescription: ''
        },
        reqs: [],
        storeUrl: ''
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
   */
  public async moveInstall(
    newInstallPath: string
  ): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
    const gameInfo = this.getGameInfo()
    logInfo(`Moving ${gameInfo.title} to ${newInstallPath}`, LogPrefix.Gog)

    const moveImpl = isWindows ? moveOnWindows : moveOnUnix
    const moveResult = await moveImpl(newInstallPath, gameInfo)

    if (moveResult.status === 'error') {
      const { error } = moveResult
      logError(
        ['Error moving', gameInfo.title, 'to', newInstallPath, error],
        LogPrefix.Legendary
      )

      return { status: 'error', error }
    }

    await LegendaryLibrary.get().changeGameInstallPath(
      this.appName,
      moveResult.installPath
    )
    return { status: 'done' }
  }

  // used when downloading games, store the download size read from Legendary's output
  currentDownloadSize = 0
  tmpProgress: InstallProgress = {
    bytes: '',
    eta: '',
    percent: undefined,
    diskSpeed: undefined,
    downSpeed: undefined
  }

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

    // parse log for eta
    if (this.tmpProgress.eta === '') {
      const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
      this.tmpProgress.eta =
        etaMatch && etaMatch?.length >= 2 ? etaMatch[1] : ''
    }

    // parse log for game download progress
    if (this.tmpProgress.bytes === '') {
      const bytesMatch = data.match(/Downloaded: (\S+.) MiB/m)
      this.tmpProgress.bytes =
        bytesMatch && bytesMatch?.length >= 2 ? `${bytesMatch[1]}MB` : ''
    }

    // parse log for download speed
    if (!this.tmpProgress.downSpeed) {
      const downSpeedMBytes = data.match(/Download\t- (\S+.) MiB/m)
      this.tmpProgress.downSpeed = !Number.isNaN(Number(downSpeedMBytes?.at(1)))
        ? Number(downSpeedMBytes?.at(1))
        : undefined
    }

    // parse disk write speed
    if (!this.tmpProgress.diskSpeed) {
      const diskSpeedMBytes = data.match(/Disk\t- (\S+.) MiB/m)
      this.tmpProgress.diskSpeed = !Number.isNaN(Number(diskSpeedMBytes?.at(1)))
        ? Number(diskSpeedMBytes?.at(1))
        : undefined
    }

    // original is in bytes, convert to MiB with 2 decimals
    totalDownloadSize =
      Math.round((totalDownloadSize / 1024 / 1024) * 100) / 100

    // calculate percentage
    if (this.tmpProgress.bytes !== '') {
      const downloaded = parseFloat(this.tmpProgress.bytes)
      const downloadCache = totalDownloadSize - this.currentDownloadSize
      const totalDownloaded = downloaded + downloadCache
      const newPercent =
        Math.round((totalDownloaded / totalDownloadSize) * 10000) / 100
      this.tmpProgress.percent = newPercent >= 0 ? newPercent : undefined
    }

    // only send to frontend if all values are updated
    if (
      Object.values(this.tmpProgress).every(
        (value) => !(value === undefined || value === '')
      )
    ) {
      logInfo(
        [
          `Progress for ${this.getGameInfo().title}:`,
          `${this.tmpProgress.percent}%/${this.tmpProgress.bytes}/${this.tmpProgress.eta}`.trim(),
          `Down: ${this.tmpProgress.downSpeed}MB/s / Disk: ${this.tmpProgress.diskSpeed}MB/s`
        ],
        LogPrefix.Legendary
      )

      sendFrontendMessage(`progressUpdate-${this.appName}`, {
        appName: this.appName,
        runner: 'legendary',
        status: action,
        progress: this.tmpProgress
      })

      // reset
      this.tmpProgress = {
        bytes: '',
        eta: '',
        percent: undefined,
        diskSpeed: undefined,
        downSpeed: undefined
      }
    }
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   */
  public async update(): Promise<{ status: 'done' | 'error' }> {
    sendFrontendMessage('gameStatusUpdate', {
      appName: this.appName,
      runner: 'legendary',
      status: 'updating'
    })
    const { maxWorkers, downloadNoHttps } = GlobalConfig.get().getSettings()
    const installPlatform = this.getGameInfo().install.platform!
    const info = await this.getInstallInfo(installPlatform)
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const noHttps = downloadNoHttps ? ['--no-https'] : []
    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = ['update', this.appName, ...workers, ...noHttps, '-y']

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput(
        'updating',
        info.manifest?.download_size,
        data
      )
    }

    const res = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName),
      {
        logFile: logPath,
        onOutput,
        logMessagePrefix: `Updating ${this.appName}`
      }
    )

    deleteAbortController(this.appName)

    sendFrontendMessage('gameStatusUpdate', {
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
    return addShortcuts(this.getGameInfo(), fromMenu)
  }

  /**
   * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
   * @async
   * @public
   */
  public async removeShortcuts() {
    return removeShortcuts(this.getGameInfo())
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
  }: InstallArgs): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    const { maxWorkers, downloadNoHttps } = GlobalConfig.get().getSettings()
    const info = await this.getInstallInfo(platformToInstall)
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const noHttps = downloadNoHttps ? ['--no-https'] : []
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    const installSdl = sdlList?.length
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
        'installing',
        info.manifest?.download_size,
        data
      )
    }

    let res = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName),
      {
        logFile: logPath,
        onOutput,
        logMessagePrefix: `Installing ${this.appName}`
      }
    )

    deleteAbortController(this.appName)

    // try to run the install again with higher memory limit
    if (res.stderr.includes('MemoryError:')) {
      res = await runLegendaryCommand(
        [...commandParts, '--max-shared-memory', '5000'],
        createAbortController(this.appName),
        {
          logFile: logPath,
          onOutput
        }
      )

      deleteAbortController(this.appName)
    }

    if (res.abort) {
      return { status: 'abort' }
    }

    if (res.error) {
      if (!res.error.includes('signal')) {
        logError(
          ['Failed to install', `${this.appName}:`, res.error],
          LogPrefix.Legendary
        )
      }
      return { status: 'error', error: res.error }
    }
    this.addShortcuts()

    const anticheatInfo = gameAnticheatInfo(this.getGameInfo().namespace)

    if (anticheatInfo && isLinux) {
      const gameConfig = GameConfig.get(this.appName)

      if (anticheatInfo.anticheats.includes('Easy Anti-Cheat')) {
        gameConfig.setSetting('eacRuntime', true)
        if (isFlatpak) gameConfig.setSetting('useGameMode', true)
      }

      if (anticheatInfo.anticheats.includes('BattlEye'))
        gameConfig.setSetting('battlEyeRuntime', true)
    }

    return { status: 'done' }
  }

  public async uninstall(): Promise<ExecResult> {
    const commandParts = ['uninstall', this.appName, '-y']

    const res = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName),
      {
        logMessagePrefix: `Uninstalling ${this.appName}`
      }
    )

    deleteAbortController(this.appName)

    if (res.error) {
      logError(
        ['Failed to uninstall', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    } else if (!res.abort) {
      LegendaryLibrary.get().installState(this.appName, false)
      await removeShortcuts(this.getGameInfo())
      const gameInfo = this.getGameInfo()
      await removeNonSteamGame({ gameInfo })
    }
    return res
  }

  /**
   * Repair game.
   * Does NOT check for online connectivity.
   */
  public async repair(): Promise<ExecResult> {
    // this.state.status = 'repairing'
    const { maxWorkers, downloadNoHttps } = GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const noHttps = downloadNoHttps ? ['--no-https'] : []

    const logPath = join(heroicGamesConfigPath, this.appName + '.log')

    const commandParts = ['repair', this.appName, ...workers, ...noHttps, '-y']

    const res = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName),
      {
        logFile: logPath,
        logMessagePrefix: `Repairing ${this.appName}`
      }
    )

    deleteAbortController(this.appName)

    if (res.error) {
      logError(
        ['Failed to repair', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return res
  }

  public async import(
    path: string,
    platform: InstallPlatform
  ): Promise<ExecResult> {
    const commandParts = [
      'import',
      '--with-dlcs',
      '--platform',
      platform,
      this.appName,
      path
    ]

    logInfo(`Importing ${this.appName}.`, LogPrefix.Legendary)

    const res = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName)
    )
    this.addShortcuts()

    deleteAbortController(this.appName)

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
  public async syncSaves(arg: string, path: string): Promise<string> {
    if (!path) {
      logError(
        'No path provided for SavesSync, check your settings!',
        LogPrefix.Legendary
      )
      return 'No path provided.'
    }

    const commandParts = [
      'sync-saves',
      arg,
      '--save-path',
      path,
      this.appName,
      '-y'
    ]

    let fullOutput = ''
    const res = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName),
      {
        logMessagePrefix: `Syncing saves for ${this.getGameInfo().title}`,
        onOutput: (output) => (fullOutput += output)
      }
    )

    deleteAbortController(this.appName)

    if (res.error) {
      logError(
        ['Failed to sync saves for', `${this.appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return fullOutput
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
    } = await prepareLaunch(gameSettings, gameInfo, this.isNative())
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

    const offlineFlag = offlineMode ? ['--offline'] : []
    const exeOverrideFlag = gameSettings.targetExe
      ? ['--override-exe', gameSettings.targetExe]
      : []

    const languageCode =
      gameSettings.language || configStore.get('language', '')
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
        if (wineLaunchPrepFailReason) {
          showDialogBoxModalAuto({
            title: t('box.error.launchAborted', 'Launch aborted'),
            message: wineLaunchPrepFailReason!,
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

      wineFlag.push(
        ...(wineType === 'proton'
          ? ['--no-wine', '--wrapper', `'${wineBin}' run`]
          : ['--wine', wineBin])
      )
    }

    sendFrontendMessage('gameStatusUpdate', {
      appName: this.appName,
      runner: this.runner,
      status: 'playing'
    })

    // Log any launch information configured in Legendary's config.ini
    const { stdout } = await runLegendaryCommand(
      ['launch', this.appName, '--json', '--offline'],
      createAbortController(this.appName)
    )

    appendFileSync(
      this.logFileLocation,
      "Legendary's config from config.ini (before Heroic's settings):\n"
    )

    try {
      const json = JSON.parse(stdout)
      // remove egl auth info
      delete json['egl_parameters']

      appendFileSync(
        this.logFileLocation,
        JSON.stringify(json, null, 2) + '\n\n'
      )
    } catch (error) {
      // in case legendary's command fails and the output is not json
      appendFileSync(this.logFileLocation, error + '\n' + stdout + '\n\n')
    }

    const commandParts = [
      'launch',
      this.appName,
      ...languageFlag,
      ...exeOverrideFlag,
      ...offlineFlag,
      ...wineFlag,
      ...shlex.split(launchArguments ?? ''),
      isCLINoGui ? '--skip-version-check' : '',
      ...shlex.split(gameSettings.launcherArgs ?? '')
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
      join(...Object.values(getLegendaryBin()))
    )
    appendFileSync(
      this.logFileLocation,
      `Launch Command: ${fullCommand}\n\nGame Log:\n`
    )

    const { error } = await runLegendaryCommand(
      commandParts,
      createAbortController(this.appName),
      {
        env: commandEnv,
        wrappers: wrappers,
        logMessagePrefix: `Launching ${gameInfo.title}`,
        onOutput: (output) => {
          appendFileSync(this.logFileLocation, output)
        }
      }
    )

    deleteAbortController(this.appName)

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

  public async runWineCommand({
    commandParts,
    wait = false,
    protonVerb,
    startFolder
  }: WineCommandArgs): Promise<ExecResult> {
    if (this.isNative()) {
      logError('runWineCommand called on native game!', LogPrefix.Legendary)
      return { stdout: '', stderr: '' }
    }

    const { folder_name } = this.getGameInfo()
    const gameSettings = await this.getSettings()

    return runWineCommand({
      gameSettings,
      installFolderName: folder_name,
      commandParts,
      wait,
      protonVerb,
      startFolder
    })
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
      await runLegendaryCommand(
        ['uninstall', this.appName, '-y', '--keep-files'],
        createAbortController(this.appName)
      )

      deleteAbortController(this.appName)

      sendFrontendMessage('refreshLibrary', 'legendary')
    } catch (error) {
      logError(
        `Error reading ${installed}, could not complete operation`,
        LogPrefix.Legendary
      )
    }
  }

  // Could be removed if legendary handles SIGKILL and SIGTERM for us
  // which is send via AbortController
  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    const pattern = process.platform === 'linux' ? this.appName : 'legendary'
    killPattern(pattern)
    if (!this.isNative()) {
      const gameSettings = await this.getSettings()
      await shutdownWine(gameSettings)
    }
  }
}

export { LegendaryGame }
