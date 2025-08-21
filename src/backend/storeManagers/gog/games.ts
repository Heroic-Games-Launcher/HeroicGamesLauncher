import { libraryManagerMap } from '..'
import { join } from 'path'
import { GameConfig } from '../../game_config'
import { GlobalConfig } from '../../config'
import {
  errorHandler,
  getFileSize,
  spawnAsync,
  moveOnUnix,
  moveOnWindows,
  shutdownWine,
  sendProgressUpdate,
  sendGameStatusUpdate,
  getPathDiskSize,
  getCometBin
} from '../../utils'
import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstalledInfo,
  InstallProgress,
  LaunchOption
} from 'common/types'
import { existsSync, rmSync } from 'graceful-fs'
import {
  configStore,
  installedGamesStore,
  playtimeSyncQueue,
  privateBranchesStore,
  syncStore
} from './electronStores'
import {
  logError,
  logInfo,
  LogPrefix,
  logWarning,
  createGameLogWriter,
  getRunnerLogWriter
} from 'backend/logger'
import { GOGUser } from './user'
import {
  getKnownFixesEnvVariables,
  getWinePath,
  launchCleanup,
  prepareLaunch,
  prepareWineLaunch,
  runWineCommand,
  runWineCommand as runWineCommandUtil,
  setupEnvVars,
  setupWrapperEnvVars,
  setupWrappers
} from '../../launcher'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import setup from './setup'
import { removeNonSteamGame } from '../../shortcuts/nonesteamgame/nonesteamgame'
import shlex from 'shlex'
import {
  GOGCloudSavesLocation,
  GogInstallPlatform,
  UserData
} from 'common/types/gog'
import { t } from 'i18next'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { sendFrontendMessage } from '../../ipc'
import { Game, RemoveArgs } from 'common/types/game_manager'
import {
  getWineFlagsArray,
  isUmuSupported
} from 'backend/utils/compatibility_layers'
import axios, { AxiosError } from 'axios'
import { isOnline, runOnceWhenOnline } from 'backend/online_monitor'
import { readdir, readFile } from 'fs/promises'
import ini from 'ini'
import { getRequiredRedistList, updateRedist } from './redist'
import { spawn } from 'child_process'
import { getUmuId } from 'backend/wiki_game_info/umu/utils'
import { gogdlConfigPath, gogSupportPath } from './constants'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'

import type LogWriter from 'backend/logger/log_writer'

export default class GOGGame implements Game {
  private readonly id: string

  constructor(id: string) {
    this.id = id
  }

  async getExtraInfo(): Promise<ExtraInfo> {
    const gameInfo = this.getGameInfo()
    let targetPlatform: GogInstallPlatform = 'windows'

    if (isMac && gameInfo.is_mac_native) {
      targetPlatform = 'osx'
    } else if (isLinux && gameInfo.is_linux_native) {
      targetPlatform = 'linux'
    } else {
      targetPlatform = 'windows'
    }

    const reqs = await libraryManagerMap['gog'].createReqsArray(
      this.id,
      targetPlatform
    )
    const productInfo = await libraryManagerMap['gog'].getProductApi(this.id, [
      'changelog'
    ])

    const gamesData = await libraryManagerMap['gog'].getGamesData(this.id)

    let gogStoreUrl = gamesData?._links?.store.href
    const releaseDate =
      gamesData?._embedded.product?.globalReleaseDate?.substring(0, 19)

    if (gogStoreUrl) {
      const storeUrl = new URL(gogStoreUrl)
      storeUrl.hostname = 'af.gog.com'
      storeUrl.searchParams.set('as', '1838482841')
      gogStoreUrl = storeUrl.toString()
    }

    const extra: ExtraInfo = {
      about: gameInfo.extra?.about,
      reqs,
      releaseDate,
      storeUrl: gogStoreUrl,
      changelog: productInfo?.data.changelog
    }
    return extra
  }

  getGameInfo(): GameInfo {
    const info = libraryManagerMap['gog'].getGameInfo(this.id)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.id},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        LogPrefix.Gog
      )
      return {
        app_name: '',
        runner: 'gog',
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

  async importGame(folderPath: string): Promise<ExecResult> {
    const res = await libraryManagerMap['gog'].runRunnerCommand(
      ['import', folderPath],
      {
        abortId: this.id,
        logMessagePrefix: `Importing ${this.id}`
      }
    )

    if (res.abort) {
      return res
    }

    if (res.error) {
      logError([`Failed to import ${this.id}:`, res.error], LogPrefix.Gog)
      return res
    }

    try {
      await libraryManagerMap['gog'].importGame(
        JSON.parse(res.stdout),
        folderPath
      )
      this.addShortcuts()
    } catch (error) {
      logError([`Failed to import ${this.id}:`, error], LogPrefix.Gog)
    }

    return res
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
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    totalDownloadSize = -1
  ) {
    if (!this.tmpProgress) {
      this.tmpProgress = this.defaultTmpProgress()
    }
    const progress = this.tmpProgress

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
          `Progress for ${this.getGameInfo().title}:`,
          `${progress.percent}%/${progress.bytes}/${progress.eta}`.trim(),
          `Down: ${progress.downSpeed}MB/s / Disk: ${progress.diskSpeed}MB/s`
        ],
        LogPrefix.Gog
      )

      sendProgressUpdate({
        appName: this.id,
        runner: 'gog',
        status: action,
        progress: progress
      })

      // reset
      this.tmpProgress = this.defaultTmpProgress()
    }
  }

  async install({
    path,
    installDlcs,
    platformToInstall,
    installLanguage,
    build,
    branch
  }: InstallArgs): Promise<{
    status: 'done' | 'error' | 'abort'
    error?: string
  }> {
    const { maxWorkers } = GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const privateBranchPassword = privateBranchesStore.get(this.id, '')
    const withDlcs = installDlcs?.length
      ? ['--with-dlcs', '--dlcs', installDlcs.join(',')]
      : ['--skip-dlcs']

    const buildArgs = build ? ['--build', build] : []
    const branchArgs = branch ? ['--branch', branch] : []

    const credentials = await GOGUser.getCredentials()

    if (!credentials) {
      logError(
        ['Failed to install', `${this.id}:`, 'No credentials'],
        LogPrefix.Gog
      )
      return { status: 'error' }
    }

    const installPlatform =
      platformToInstall === 'Mac'
        ? 'osx'
        : (platformToInstall.toLowerCase() as GogInstallPlatform)

    const commandParts: string[] = [
      'download',
      this.id,
      '--platform',
      installPlatform,
      '--path',
      path,
      '--support',
      join(gogSupportPath, this.id),
      ...withDlcs,
      '--lang',
      String(installLanguage),
      ...buildArgs,
      ...branchArgs,
      ...workers
    ]

    if (privateBranchPassword.length) {
      commandParts.push('--password', privateBranchPassword)
    }

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput('installing', data)
    }

    const installLogWriter = await createGameLogWriter(
      this.id,
      'gog',
      'install'
    )
    const res = await libraryManagerMap['gog'].runRunnerCommand(commandParts, {
      abortId: this.id,
      logWriters: [installLogWriter],
      onOutput,
      logMessagePrefix: `Installing ${this.id}`
    })

    if (res.abort) {
      return { status: 'abort' }
    }

    if (res.error) {
      logError(
        ['Failed to install GOG game ', `${this.id}:`, res.error],
        LogPrefix.Gog
      )
      return { status: 'error', error: res.error }
    }

    // Installation succeded
    // Save new game info to installed games store
    const installInfo = await libraryManagerMap['gog'].getInstallInfo(
      this.id,
      installPlatform,
      {
        branch,
        build
      }
    )
    if (installInfo === undefined) {
      logError('install info is undefined in GOG install', LogPrefix.Gog)
      return { status: 'error' }
    }
    const gameInfo = this.getGameInfo()
    const isLinuxNative = installPlatform === 'linux'
    const additionalInfo = isLinuxNative
      ? await libraryManagerMap['gog'].getLinuxInstallerInfo(this.id)
      : null

    if (
      gameInfo.folder_name === undefined ||
      gameInfo.folder_name.length === 0
    ) {
      logError('game info folder is undefined in GOG install', LogPrefix.Gog)
      return { status: 'error' }
    }

    const sizeOnDisk = await getPathDiskSize(join(path, gameInfo.folder_name))
    const install_path = join(path, gameInfo.folder_name)

    const installedData: InstalledInfo = {
      platform: installPlatform,
      executable: '',
      install_path,
      install_size: getFileSize(sizeOnDisk),
      is_dlc: false,
      version: additionalInfo
        ? additionalInfo.version
        : installInfo.game.version,
      appName: this.id,
      installedDLCs: installDlcs,
      language: installLanguage,
      versionEtag: isLinuxNative ? '' : installInfo.manifest.versionEtag,
      buildId: isLinuxNative ? '' : installInfo.game.buildId,
      pinnedVersion: !!build
    }
    const array = installedGamesStore.get('installed', [])
    array.push(installedData)
    installedGamesStore.set('installed', array)
    gameInfo.is_installed = true
    gameInfo.install = installedData
    libraryManagerMap['gog'].refreshInstalled()
    if (isWindows) {
      logInfo(
        'Windows os, running setup instructions on install',
        LogPrefix.Gog
      )
      try {
        await setup(this.id, installedData)
      } catch (e) {
        logWarning(
          [
            `Failed to run setup instructions on install for ${gameInfo.title}`,
            'Error:',
            e
          ],
          LogPrefix.Gog
        )
      }
    } else if (isLinuxNative) {
      const installer = join(install_path, 'support/postinst.sh')
      if (existsSync(installer)) {
        logInfo(`Running ${installer}`, LogPrefix.Gog)
        await spawnAsync(installer, []).catch((err) =>
          logError(
            `Failed to run linux installer: ${installer} - ${err}`,
            LogPrefix.Gog
          )
        )
      }
    }
    this.addShortcuts()
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
    return addShortcutsUtil(this.getGameInfo(), fromMenu)
  }

  async removeShortcuts() {
    return removeShortcutsUtil(this.getGameInfo())
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
      !gameInfo.install.platform
    ) {
      return false
    }

    if (!existsSync(gameInfo.install.install_path)) {
      errorHandler({
        error: 'appears to be deleted',
        runner: 'gog',
        appName: gameInfo.app_name
      })
      return false
    }

    const {
      success: launchPrepSuccess,
      failureReason: launchPrepFailReason,
      rpcClient,
      mangoHudCommand,
      gameScopeCommand,
      gameModeBin,
      steamRuntime
    } = await prepareLaunch(gameSettings, logWriter, gameInfo, this.isNative())
    if (!launchPrepSuccess) {
      logWriter.logError(['Launch aborted:', launchPrepFailReason])
      launchCleanup()
      showDialogBoxModalAuto({
        title: t('box.error.launchAborted', 'Launch aborted'),
        message: launchPrepFailReason!,
        type: 'ERROR'
      })
      return false
    }

    let exeOverrideFlag: string[] = []
    if (launchArguments?.type === 'altExe') {
      exeOverrideFlag = ['--override-exe', launchArguments.executable]
    } else if (gameSettings.targetExe) {
      exeOverrideFlag = ['--override-exe', gameSettings.targetExe]
    }

    let commandEnv = {
      ...process.env,
      ...setupWrapperEnvVars({ appName: this.id, appRunner: 'gog' }),
      ...(isWindows
        ? {}
        : setupEnvVars(gameSettings, gameInfo.install.install_path)),
      ...getKnownFixesEnvVariables(this.id, 'gog')
    }

    const wrappers = setupWrappers(
      gameSettings,
      mangoHudCommand,
      gameModeBin,
      gameScopeCommand,
      steamRuntime?.length ? [...steamRuntime] : undefined
    )

    let wineFlag: string[] = wrappers.length
      ? ['--wrapper', shlex.join(wrappers)]
      : []

    if (!this.isNative()) {
      const {
        success: wineLaunchPrepSuccess,
        failureReason: wineLaunchPrepFailReason,
        envVars: wineEnvVars
      } = await prepareWineLaunch('gog', this.id, logWriter)
      if (!wineLaunchPrepSuccess) {
        logWriter.logError(['Launch aborted:', wineLaunchPrepFailReason])
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

      if (await isUmuSupported(gameSettings)) {
        const umuId = await getUmuId(gameInfo.app_name, gameInfo.runner)
        if (umuId) {
          commandEnv['GAMEID'] = umuId
        }
      }

      wineFlag = await getWineFlagsArray(gameSettings, shlex.join(wrappers))
    }

    const launchArgumentsArgs =
      launchArguments &&
      (launchArguments.type === undefined || launchArguments.type === 'basic')
        ? launchArguments.parameters
        : ''

    const commandParts = [
      'launch',
      gameInfo.install.install_path,
      ...exeOverrideFlag,
      gameInfo.app_name === '1423049311' &&
      gameInfo.install.cyberpunk?.modsEnabled
        ? '1597316373'
        : gameInfo.app_name,
      ...wineFlag,
      '--platform',
      gameInfo.install.platform.toLowerCase(),
      ...shlex.split(launchArgumentsArgs),
      ...shlex.split(gameSettings.launcherArgs ?? ''),
      ...args
    ]

    if (gameInfo.install.cyberpunk?.modsEnabled) {
      const startFolder = join(
        gameInfo.install.install_path,
        'tools',
        'redmod',
        'bin'
      )

      if (existsSync(startFolder)) {
        const installDirectory = isWindows
          ? gameInfo.install.install_path
          : await getWinePath({
              path: gameInfo.install.install_path,
              variant: 'win',
              gameSettings
            })

        const availableMods = await libraryManagerMap['gog'].getCyberpunkMods()
        const modsEnabledToLoad = gameInfo.install.cyberpunk.modsToLoad
        const modsAbleToLoad: string[] = []

        for (const mod of modsEnabledToLoad) {
          if (availableMods.includes(mod)) {
            modsAbleToLoad.push(mod)
          }
        }

        if (!modsEnabledToLoad.length && !!availableMods.length) {
          logWarning(
            'No mods selected to load, loading all in alphabetic order'
          )
          modsAbleToLoad.push(...availableMods)
        }

        const redModCommand = [
          'redMod.exe',
          'deploy',
          '-reportProgress',
          '-root',
          installDirectory,
          ...modsAbleToLoad.map((mod) => ['-mod', mod]).flat()
        ]

        let result: { stdout: string; stderr: string; code?: number | null } = {
          stdout: '',
          stderr: ''
        }
        if (isWindows) {
          const [bin, ...args] = redModCommand
          result = await spawnAsync(bin, args, { cwd: startFolder })
        } else {
          result = await runWineCommandUtil({
            commandParts: redModCommand,
            wait: true,
            gameSettings,
            gameInstallPath: gameInfo.install.install_path,
            startFolder
          })
        }
        logInfo(result.stdout, { prefix: LogPrefix.Gog })
        logWriter.writeString(
          `\nMods deploy log:\n${result.stdout}\n\n${result.stderr}\n\n\n`
        )
        if (result.stderr.includes('deploy has succeeded')) {
          showDialogBoxModalAuto({
            title: 'Mod deploy failed',
            message: `Following logs are also available in game log\n\nredMod log:\n ${result.stdout}\n\n\n${result.stderr}`,
            type: 'ERROR'
          })
          return true
        }
        commandParts.push('--prefer-task', '0')
      } else {
        logError(['Unable to start modded game'], { prefix: LogPrefix.Gog })
      }
    }

    const userData: UserData | undefined = configStore.get_nodefault('userData')

    sendGameStatusUpdate({ appName: this.id, runner: 'gog', status: 'playing' })

    let child = undefined

    const cometLogWriter = getRunnerLogWriter('comet')

    if (
      userData &&
      userData.username &&
      GlobalConfig.get().getSettings().experimentalFeatures?.cometSupport !==
        false
    ) {
      const path = getCometBin()
      child = spawn(join(path.dir, path.bin), [
        '--from-heroic',
        '--username',
        userData.username,
        '--quit'
      ])
      child.stdout.setEncoding('utf-8')
      child.stderr.setEncoding('utf-8')
      child.stdout.on('data', (data: string) => {
        cometLogWriter.writeString(data)
      })
      child.stderr.on('data', (data: string) => {
        cometLogWriter.writeString(data)
      })
      logInfo(`Launching Comet!`, LogPrefix.Gog)
    }

    const { error, abort } = await libraryManagerMap['gog'].runRunnerCommand(
      commandParts,
      {
        abortId: this.id,
        env: commandEnv,
        wrappers,
        logMessagePrefix: `Launching ${gameInfo.title}`,
        logWriters: [logWriter]
      }
    )

    if (child) {
      logInfo(`Killing Comet!`, LogPrefix.Gog)
      child.kill()
    }
    launchCleanup(rpcClient)

    if (abort) {
      return true
    }

    if (error) {
      logError(['Error launching game:', error], LogPrefix.Gog)
    }

    return !error
  }

  async moveInstall(
    newInstallPath: string
  ): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
    const gameInfo = this.getGameInfo()
    const gameConfig = await this.getSettings()
    logInfo(`Moving ${gameInfo.title} to ${newInstallPath}`, LogPrefix.Gog)

    const moveImpl = isWindows ? moveOnWindows : moveOnUnix
    const moveResult = await moveImpl(newInstallPath, gameInfo)

    if (moveResult.status === 'error') {
      const { error } = moveResult
      logError(
        ['Error moving', gameInfo.title, 'to', newInstallPath, error],
        LogPrefix.Gog
      )

      return { status: 'error', error }
    }

    await libraryManagerMap['gog'].changeGameInstallPath(
      this.id,
      moveResult.installPath
    )
    if (
      gameInfo.install.platform === 'windows' &&
      (isWindows || existsSync(gameConfig.winePrefix))
    ) {
      await setup(this.id, undefined, false)
    }
    return { status: 'done' }
  }

  /*
   * This proces verifies and repairs game files
   * verification step doesn't have progress, but download does
   */
  async repair(): Promise<ExecResult> {
    const { installPlatform, gameData, credentials, withDlcs, workers } =
      await this.getCommandParameters()

    if (!credentials) {
      return { stderr: 'Unable to repair game, no credentials', stdout: '' }
    }
    const privateBranchPassword = privateBranchesStore.get(this.id, '')

    // Most of the data provided here is discarded and read from manifest instead
    const commandParts = [
      'repair',
      this.id,
      '--platform',
      installPlatform!,
      '--path',
      gameData.install.install_path!,
      '--support',
      join(gogSupportPath, this.id),
      withDlcs,
      '--lang',
      gameData.install.language || 'en-US',
      '-b=' + gameData.install.buildId,
      ...workers
    ]

    if (privateBranchPassword.length) {
      commandParts.push('--password', privateBranchPassword)
    }

    const repairLogWriter = await createGameLogWriter(this.id, 'gog', 'repair')
    const res = await libraryManagerMap['gog'].runRunnerCommand(commandParts, {
      abortId: this.id,
      logWriters: [repairLogWriter],
      logMessagePrefix: `Repairing ${this.id}`
    })

    if (res.error) {
      logError(['Failed to repair', `${this.id}:`, res.error], LogPrefix.Gog)
    }

    return res
  }

  async syncSaves(
    arg: string,
    path: string,
    gogSaves?: GOGCloudSavesLocation[]
  ): Promise<string> {
    if (!gogSaves) {
      return 'Unable to sync saves, gogSaves is undefined'
    }

    const credentials = await GOGUser.getCredentials()
    if (!credentials) {
      return 'Unable to sync saves, no credentials'
    }

    const gameInfo = this.getGameInfo()
    if (!gameInfo || !gameInfo.install.platform) {
      return 'Unable to sync saves, game info not found'
    }

    let fullOutput = ''

    for (const location of gogSaves) {
      const commandParts = [
        'save-sync',
        location.location,
        this.id,
        '--os',
        gameInfo.install.platform,
        '--ts',
        syncStore.get(`${this.id}.${location.name}`, '0'),
        '--name',
        location.name,
        arg
      ]

      logInfo([`Syncing saves for ${gameInfo.title}`], LogPrefix.Gog)

      const res = await libraryManagerMap['gog'].runRunnerCommand(
        commandParts,
        {
          abortId: this.id,
          logMessagePrefix: `Syncing saves for ${gameInfo.title}`,
          onOutput: (output) => (fullOutput += output)
        }
      )

      if (res.error) {
        logError(
          ['Failed to sync saves for', `${this.id}`, `${res.error}`],
          LogPrefix.Gog
        )
      }
      if (res.stdout) {
        syncStore.set(`${this.id}.${location.name}`, res.stdout.trim())
      }
    }

    return fullOutput
  }

  async uninstall({ shouldRemovePrefix }: RemoveArgs): Promise<ExecResult> {
    const array = installedGamesStore.get('installed', [])
    const index = array.findIndex((game) => game.appName === this.id)
    if (index === -1) {
      throw Error("Game isn't installed")
    }

    const [object] = array.splice(index, 1)
    logInfo(['Removing', object.install_path], LogPrefix.Gog)
    // Run unins000.exe /verysilent /dir=Z:/path/to/game
    const uninstallerPath = join(object.install_path, 'unins000.exe')

    const res: ExecResult = { stdout: '', stderr: '' }
    if (existsSync(uninstallerPath)) {
      const gameSettings = await this.getSettings()

      const installDirectory = isWindows
        ? object.install_path
        : await getWinePath({
            path: object.install_path,
            gameSettings
          })

      const command = [
        uninstallerPath,
        '/VERYSILENT',
        `/ProductId=${this.id}`,
        '/galaxyclient',
        '/KEEPSAVES'
      ]

      logInfo(['Executing uninstall command', command.join(' ')], LogPrefix.Gog)

      if (!isWindows) {
        if (existsSync(gameSettings.winePrefix) && !shouldRemovePrefix) {
          await runWineCommandUtil({
            gameSettings,
            commandParts: command,
            wait: true
          })
        }
      } else {
        const adminCommand = [
          '-NoProfile',
          'Start-Process',
          '-FilePath',
          uninstallerPath,
          '-Verb',
          'RunAs',
          '-Wait',
          '-ArgumentList'
        ]

        await spawnAsync('powershell', [
          ...adminCommand,
          `"/verysilent","\`"/dir=${installDirectory}\`""`,
          ``
        ])
      }
    }
    if (existsSync(object.install_path)) {
      rmSync(object.install_path, { recursive: true })
    }
    const manifestPath = join(gogdlConfigPath, 'manifests', this.id)
    if (existsSync(manifestPath)) {
      rmSync(manifestPath) // Delete manifest so gogdl won't try to patch the not installed game
    }
    const supportPath = join(gogSupportPath, this.id)
    if (existsSync(supportPath)) {
      rmSync(supportPath, { recursive: true }) // Remove unnecessary support dir
    }
    installedGamesStore.set('installed', array)
    libraryManagerMap['gog'].refreshInstalled()
    const gameInfo = this.getGameInfo()
    gameInfo.is_installed = false
    gameInfo.install = { is_dlc: false }
    await removeShortcutsUtil(gameInfo)
    syncStore.delete(this.id)
    await removeNonSteamGame({ gameInfo })
    sendFrontendMessage('pushGameToLibrary', gameInfo)
    return res
  }

  async update(updateOverwrites?: {
    build?: string
    branch?: string
    language?: string
    dlcs?: string[]
    dependencies?: string[]
  }): Promise<{ status: 'done' | 'error' }> {
    // TODO: Implement GOG redist as a subclass of GOGGame & move this logic to it
    if (this.id === 'gog-redist') {
      const redist = await getRequiredRedistList()
      if (updateOverwrites?.dependencies?.length) {
        for (const dep of updateOverwrites.dependencies) {
          if (!redist.includes(dep)) {
            redist.push(dep)
          }
        }
      }
      return updateRedist(redist)
    }
    const {
      installPlatform,
      gameData,
      credentials,
      withDlcs,
      workers,
      dlcs,
      branch
    } = await this.getCommandParameters()
    if (!installPlatform || !credentials) {
      return { status: 'error' }
    }

    const gameConfig = await this.getSettings()
    const installedDlcs = gameData.install.installedDLCs || []

    if (updateOverwrites?.dlcs) {
      const removedDlcs = installedDlcs.filter(
        (dlc) => !updateOverwrites.dlcs?.includes(dlc)
      )
      if (
        removedDlcs.length &&
        gameData.install.platform === 'windows' &&
        (isWindows || existsSync(gameConfig.winePrefix))
      ) {
        // Run uninstaller per DLC
        // Find uninstallers of dlcs we are looking for first
        const listOfFiles = await readdir(gameData.install.install_path!)
        const uninstallerIniList = listOfFiles.filter((file) =>
          file.match(/unins\d{3}\.ini/)
        )

        for (const uninstallerFile of uninstallerIniList) {
          // Parse ini and find all uninstallers we need
          const rawData = await readFile(
            join(gameData.install.install_path!, uninstallerFile),
            { encoding: 'utf8' }
          )
          const parsedData = ini.parse(rawData)
          const productId = parsedData['InstallSettings']['productID']
          if (removedDlcs.includes(productId)) {
            // Run uninstall on DLC
            const uninstallExeFile = uninstallerFile.replace('ini', 'exe')
            if (isWindows) {
              const adminCommand = [
                '-NoProfile',
                'Start-Process',
                '-FilePath',
                uninstallExeFile,
                '-Verb',
                'RunAs',
                '-Wait',
                '-ArgumentList'
              ]
              await spawnAsync(
                'powershell',
                [
                  ...adminCommand,
                  `"/ProductId=${productId}","/VERYSILENT","/galaxyclient","/KEEPSAVES"`
                ],
                { cwd: gameData.install.install_path }
              )
            } else {
              await runWineCommand({
                gameSettings: gameConfig,
                protonVerb: 'run',
                commandParts: [
                  uninstallExeFile,
                  `/ProductId=${productId}`,
                  '/VERYSILENT',
                  '/galaxyclient',
                  '/KEEPSAVES'
                ],
                startFolder: gameData.install.install_path!
              })
            }
          }
        }
      }
    }

    const privateBranchPassword = privateBranchesStore.get(this.id, '')

    const overwrittenBuild: string[] = updateOverwrites?.build
      ? ['--build', updateOverwrites.build]
      : []

    const overwrittenBranch: string[] = updateOverwrites?.branch
      ? ['--branch', updateOverwrites.branch]
      : branch

    const overwrittenLanguage: string =
      updateOverwrites?.language || gameData.install.language || 'en-US'

    const overwrittenDlcs: string[] = updateOverwrites?.dlcs?.length
      ? ['--dlcs', updateOverwrites.dlcs.join(',')]
      : dlcs

    const overwrittenWithDlcs: string = updateOverwrites?.dlcs
      ? updateOverwrites.dlcs.length
        ? '--with-dlcs'
        : '--skip-dlcs'
      : withDlcs

    const commandParts = [
      'update',
      this.id,
      '--platform',
      installPlatform,
      '--path',
      gameData.install.install_path!,
      '--support',
      join(gogSupportPath, this.id),
      overwrittenWithDlcs,
      '--lang',
      overwrittenLanguage,
      ...overwrittenDlcs,
      ...workers,
      ...overwrittenBuild,
      ...overwrittenBranch
    ]
    if (privateBranchPassword.length) {
      commandParts.push('--password', privateBranchPassword)
    }

    const onOutput = (data: string) => {
      this.onInstallOrUpdateOutput('updating', data)
    }

    const updateLogWriter = await createGameLogWriter(this.id, 'gog', 'update')
    const res = await libraryManagerMap['gog'].runRunnerCommand(commandParts, {
      abortId: this.id,
      logWriters: [updateLogWriter],
      onOutput,
      logMessagePrefix: `Updating ${this.id}`
    })

    if (res.abort) {
      return { status: 'done' }
    }

    if (res.error) {
      logError(['Failed to update', `${this.id}:`, res.error], LogPrefix.Gog)
      sendGameStatusUpdate({
        appName: this.id,
        runner: 'gog',
        status: 'done'
      })
      return { status: 'error' }
    }

    const installedArray = installedGamesStore.get('installed', [])
    const gameIndex = installedArray.findIndex(
      (value) => this.id === value.appName
    )
    const gameObject = installedArray[gameIndex]

    if (gameData.install.platform !== 'linux') {
      const installInfo = await libraryManagerMap['gog'].getInstallInfo(
        this.id,
        gameData.install.platform ?? 'windows',
        {
          branch: updateOverwrites?.branch,
          build: updateOverwrites?.build
        }
      )
      // TODO: use installInfo.game.builds
      const { etag } = await libraryManagerMap['gog'].getMetaResponse(
        this.id,
        gameData.install.platform ?? 'windows',
        installInfo?.manifest.versionEtag
      )
      if (installInfo === undefined) return { status: 'error' }
      gameObject.buildId = installInfo.game.buildId
      gameObject.version = installInfo.game.version
      gameObject.branch = updateOverwrites?.branch
      gameObject.language = overwrittenLanguage
      gameObject.versionEtag = etag
    } else {
      const installerInfo = await libraryManagerMap[
        'gog'
      ].getLinuxInstallerInfo(this.id)
      if (!installerInfo) {
        return { status: 'error' }
      }
      gameObject.version = installerInfo.version
    }
    if (updateOverwrites?.dlcs) {
      gameObject.installedDLCs = updateOverwrites?.dlcs
    }
    const sizeOnDisk = await getPathDiskSize(join(gameObject.install_path))
    gameObject.install_size = getFileSize(sizeOnDisk)
    installedGamesStore.set('installed', installedArray)
    libraryManagerMap['gog'].refreshInstalled()
    const gameSettings = await this.getSettings()
    // Simple check if wine prefix exists and setup can be performed because of an
    // update
    if (
      gameObject.platform === 'windows' &&
      (isWindows || existsSync(gameSettings.winePrefix))
    ) {
      await setup(this.id, gameObject, false)
    } else if (gameObject.platform === 'linux') {
      const installer = join(gameObject.install_path, 'support/postinst.sh')
      if (existsSync(installer)) {
        logInfo(`Running ${installer}`, LogPrefix.Gog)
        await spawnAsync(installer, []).catch((err) =>
          logError(
            `Failed to run linux installer: ${installer} - ${err}`,
            LogPrefix.Gog
          )
        )
      }
    }
    sendGameStatusUpdate({
      appName: this.id,
      runner: 'gog',
      status: 'done'
    })
    gameData.install = gameObject
    sendFrontendMessage('pushGameToLibrary', gameData)
    return { status: 'done' }
  }

  /**
   * Reads game installed data and returns proper parameters
   * Useful for Update and Repair
   */
  private async getCommandParameters() {
    const { maxWorkers } = GlobalConfig.get().getSettings()
    const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
    const gameData = this.getGameInfo()
    const credentials = await GOGUser.getCredentials()

    const numberOfDLCs = gameData.install?.installedDLCs?.length || 0

    const withDlcs =
      gameData.install.installedWithDLCs || numberOfDLCs > 0
        ? '--with-dlcs'
        : '--skip-dlcs'

    const dlcs =
      gameData.install.installedDLCs && numberOfDLCs > 0
        ? ['--dlcs', gameData.install.installedDLCs.join(',')]
        : []

    const branch = gameData.install.branch
      ? ['--branch', gameData.install.branch]
      : []

    const installPlatform = gameData.install.platform

    return {
      withDlcs,
      workers,
      installPlatform,
      credentials,
      gameData,
      dlcs,
      branch
    }
  }

  async forceUninstall(): Promise<void> {
    const installed = installedGamesStore.get('installed', [])
    const newInstalled = installed.filter((g) => g.appName !== this.id)
    installedGamesStore.set('installed', newInstalled)
    libraryManagerMap['gog'].refreshInstalled()
    sendFrontendMessage('pushGameToLibrary', this.getGameInfo())
  }

  // GOGDL now handles the signal, this is no longer needed
  async stop(stopWine = true): Promise<void> {
    if (stopWine && !this.isNative()) {
      const gameSettings = await this.getSettings()
      await shutdownWine(gameSettings)
    }
  }

  async isGameAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const info = this.getGameInfo()
      if (info && info.is_installed) {
        if (
          info.install.install_path &&
          existsSync(info.install.install_path)
        ) {
          resolve(true)
        } else {
          resolve(false)
        }
      }
      resolve(false)
    })
  }

  async updateGOGPlaytime(startPlayingDate: Date, finishedPlayingDate: Date) {
    // Let server know about new session
    const sessionDate = Math.floor(startPlayingDate.getTime() / 1000) // In seconds
    const time = Math.floor(
      (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
    ) // In minutes

    // It makes no sense to post 0 minutes of playtime
    if (time < 1) {
      return
    }

    const data = {
      session_date: sessionDate,
      time
    }
    const userData: UserData | undefined = configStore.get_nodefault('userData')

    if (!userData) {
      logWarning(['Unable to post session, userData not present'], {
        prefix: LogPrefix.Gog
      })
      return
    }

    if (!isOnline()) {
      logWarning(['App offline, unable to post new session at this time'], {
        prefix: LogPrefix.Gog
      })
      const alreadySetData = playtimeSyncQueue.get(userData.galaxyUserId, [])
      alreadySetData.push({ ...data, appName: this.id })
      playtimeSyncQueue.set(userData.galaxyUserId, alreadySetData)
      runOnceWhenOnline(libraryManagerMap['gog'].syncQueuedPlaytime)
      return
    }

    const response = await libraryManagerMap['gog']
      .postPlaytimeSession({
        ...data,
        appName: this.id
      })
      .catch(() => null)

    if (!response || response.status !== 201) {
      logError('Failed to post session', { prefix: LogPrefix.Gog })
      const alreadySetData = playtimeSyncQueue.get(userData.galaxyUserId, [])
      alreadySetData.push({ ...data, appName: this.id })
      playtimeSyncQueue.set(userData.galaxyUserId, alreadySetData)
      return
    }

    logInfo('Posted session to gameplay.gog.com', { prefix: LogPrefix.Gog })
  }

  async getGOGPlaytime(): Promise<number | undefined> {
    if (!isOnline()) {
      return
    }
    const credentials = await GOGUser.getCredentials()
    const userData: UserData | undefined = configStore.get_nodefault('userData')

    if (!credentials || !userData) {
      return
    }
    const response = await axios
      .get(
        `https://gameplay.gog.com/games/${this.id}/users/${userData?.galaxyUserId}/sessions`,
        {
          headers: {
            Authorization: `Bearer ${credentials.access_token}`
          }
        }
      )
      .catch((e: AxiosError) => {
        logWarning(['Failed attempt to get playtime of', this.id, e.toJSON()], {
          prefix: LogPrefix.Gog
        })
        return null
      })

    return response?.data?.time_sum
  }

  getBranchPassword(): string {
    return privateBranchesStore.get(this.id, '')
  }

  setBranchPassword(password: string): void {
    privateBranchesStore.set(this.id, password)
  }
}
