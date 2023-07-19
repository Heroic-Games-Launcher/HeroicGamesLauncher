import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import {
  importGame as importGogLibraryGame,
  refreshInstalled,
  runRunnerCommand as runGogdlCommand,
  getInstallInfo,
  getLinuxInstallerInfo,
  createReqsArray,
  getGameInfo as getGogLibraryGameInfo,
  changeGameInstallPath,
  getMetaResponse,
  getGamesData
} from './library'
import { join } from 'path'
import { GameConfig } from '../../game_config'
import { GlobalConfig } from '../../config'
import {
  errorHandler,
  getFileSize,
  getGOGdlBin,
  killPattern,
  spawnAsync,
  moveOnUnix,
  moveOnWindows,
  shutdownWine
} from '../../utils'
import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstalledInfo,
  InstallPlatform,
  InstallProgress
} from 'common/types'
import { appendFileSync, existsSync, rmSync } from 'graceful-fs'
import { gamesConfigPath, isWindows, isMac, isLinux } from '../../constants'
import {
  configStore,
  installedGamesStore,
  playtimeSyncQueue,
  syncStore
} from './electronStores'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logsDisabled,
  logWarning
} from '../../logger/logger'
import { GOGUser } from './user'
import {
  getRunnerCallWithoutCredentials,
  getWinePath,
  launchCleanup,
  prepareLaunch,
  prepareWineLaunch,
  runWineCommand as runWineCommandUtil,
  setupEnvVars,
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
  GOGSessionSyncQueueItem,
  GogInstallPlatform,
  UserData
} from 'common/types/gog'
import { t } from 'i18next'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { sendFrontendMessage } from '../../main_window'
import { RemoveArgs } from 'common/types/game_manager'
import { logFileLocation } from 'backend/storeManagers/storeManagerCommon/games'
import { getWineFlags } from 'backend/utils/compatibility_layers'
import axios, { AxiosError } from 'axios'
import { isOnline, runOnceWhenOnline } from 'backend/online_monitor'

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const gameInfo = getGameInfo(appName)
  let targetPlatform: GogInstallPlatform = 'windows'

  if (isMac && gameInfo.is_mac_native) {
    targetPlatform = 'osx'
  } else if (isLinux && gameInfo.is_linux_native) {
    targetPlatform = 'linux'
  } else {
    targetPlatform = 'windows'
  }

  const reqs = await createReqsArray(appName, targetPlatform)
  const storeUrl = (await getGamesData(appName))?._links.store.href

  const extra: ExtraInfo = {
    about: gameInfo.extra?.about,
    reqs,
    storeUrl
  }
  return extra
}

export function getGameInfo(appName: string): GameInfo {
  const info = getGogLibraryGameInfo(appName)
  if (!info) {
    logError(
      [
        'Could not get game info for',
        `${appName},`,
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
  const res = await runGogdlCommand(
    ['import', folderPath],
    createAbortController(appName),
    {
      logMessagePrefix: `Importing ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.abort) {
    return res
  }

  if (res.error) {
    logError(['Failed to import', `${appName}:`, res.error], LogPrefix.Gog)
    return res
  }

  try {
    await importGogLibraryGame(JSON.parse(res.stdout), folderPath)
    addShortcuts(appName)
  } catch (error) {
    logError(['Failed to import', `${appName}:`, error], LogPrefix.Gog)
  }

  return res
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
        `Progress for ${getGameInfo(appName).title}:`,
        `${progress.percent}%/${progress.bytes}/${progress.eta}`.trim(),
        `Down: ${progress.downSpeed}MB/s / Disk: ${progress.diskSpeed}MB/s`
      ],
      LogPrefix.Gog
    )

    sendFrontendMessage(`progressUpdate-${appName}`, {
      appName: appName,
      runner: 'gog',
      status: action,
      progress: progress
    })

    // reset
    tmpProgress[appName] = defaultTmpProgress()
  }
}

export async function install(
  appName: string,
  { path, installDlcs, platformToInstall, installLanguage }: InstallArgs
): Promise<{
  status: 'done' | 'error' | 'abort'
  error?: string
}> {
  const { maxWorkers } = GlobalConfig.get().getSettings()
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
  const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'

  const credentials = await GOGUser.getCredentials()

  if (!credentials) {
    logError(
      ['Failed to install', `${appName}:`, 'No credentials'],
      LogPrefix.Gog
    )
    return { status: 'error' }
  }

  const installPlatform =
    platformToInstall === 'Mac'
      ? 'osx'
      : (platformToInstall.toLowerCase() as GogInstallPlatform)

  const logPath = join(gamesConfigPath, appName + '.log')

  const commandParts: string[] = [
    'download',
    appName,
    '--platform',
    installPlatform,
    `--path=${path}`,
    '--token',
    `"${credentials.access_token}"`,
    withDlcs,
    `--lang=${installLanguage}`,
    ...workers
  ]

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(appName, 'installing', data)
  }

  const res = await runGogdlCommand(
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
    logError(
      ['Failed to install GOG game ', `${appName}:`, res.error],
      LogPrefix.Gog
    )
    return { status: 'error', error: res.error }
  }

  // Installation succeded
  // Save new game info to installed games store
  const installInfo = await getInstallInfo(appName, installPlatform)
  if (installInfo === undefined) {
    logError('install info is undefined in GOG install', LogPrefix.Gog)
    return { status: 'error' }
  }
  const gameInfo = getGameInfo(appName)
  const isLinuxNative = installPlatform === 'linux'
  const additionalInfo = isLinuxNative
    ? await getLinuxInstallerInfo(appName)
    : null

  if (gameInfo.folder_name === undefined || gameInfo.folder_name.length === 0) {
    logError('game info folder is undefined in GOG install', LogPrefix.Gog)
    return { status: 'error' }
  }
  const installedData: InstalledInfo = {
    platform: installPlatform,
    executable: '',
    install_path: join(path, gameInfo.folder_name),
    install_size: getFileSize(installInfo.manifest.disk_size),
    is_dlc: false,
    version: additionalInfo ? additionalInfo.version : installInfo.game.version,
    appName: appName,
    installedWithDLCs: Boolean(installDlcs),
    language: installLanguage,
    versionEtag: isLinuxNative ? '' : installInfo.manifest.versionEtag,
    buildId: isLinuxNative ? '' : installInfo.game.buildId
  }
  const array = installedGamesStore.get('installed', [])
  array.push(installedData)
  installedGamesStore.set('installed', array)
  refreshInstalled()
  if (isWindows) {
    logInfo('Windows os, running setup instructions on install', LogPrefix.Gog)
    try {
      await setup(appName, installedData)
    } catch (e) {
      logWarning(
        [
          `Failed to run setup instructions on install for ${gameInfo.title}, some other step might be needed for the game to work. Check the 'goggame-${appName}.script' file in the game folder`,
          'Error:',
          e
        ],
        LogPrefix.Gog
      )
    }
  }
  addShortcuts(appName)
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
  launchArguments?: string
): Promise<boolean> {
  const gameSettings = await getSettings(appName)
  const gameInfo = getGameInfo(appName)

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
    gameModeBin,
    steamRuntime
  } = await prepareLaunch(gameSettings, gameInfo, isNative(appName))
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

  if (!isNative(appName)) {
    const {
      success: wineLaunchPrepSuccess,
      failureReason: wineLaunchPrepFailReason,
      envVars: wineEnvVars
    } = await prepareWineLaunch('gog', appName)
    if (!wineLaunchPrepSuccess) {
      appendFileSync(
        logFileLocation(appName),
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

    wineFlag = [...getWineFlags(wineBin, gameSettings, wineType)]
  }

  const commandParts = [
    'launch',
    gameInfo.install.install_path,
    ...exeOverrideFlag,
    gameInfo.app_name,
    ...wineFlag,
    '--platform',
    gameInfo.install.platform.toLowerCase(),
    ...shlex.split(launchArguments ?? ''),
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
    join(...Object.values(getGOGdlBin()))
  )
  appendFileSync(
    logFileLocation(appName),
    `Launch Command: ${fullCommand}\n\nGame Log:\n`
  )

  const { error, abort } = await runGogdlCommand(
    commandParts,
    createAbortController(appName),
    {
      env: commandEnv,
      wrappers,
      logMessagePrefix: `Launching ${gameInfo.title}`,
      onOutput: (output: string) => {
        if (!logsDisabled) appendFileSync(logFileLocation(appName), output)
      }
    }
  )

  deleteAbortController(appName)

  if (abort) {
    return true
  }

  if (error) {
    logError(['Error launching game:', error], LogPrefix.Gog)
  }

  launchCleanup(rpcClient)

  return !error
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<{ status: 'done' } | { status: 'error'; error: string }> {
  const gameInfo = getGameInfo(appName)
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

  changeGameInstallPath(appName, moveResult.installPath)
  return { status: 'done' }
}

/**
 * Literally installing game, since gogdl verifies files at runtime
 */
export async function repair(appName: string): Promise<ExecResult> {
  const { installPlatform, gameData, credentials, withDlcs, logPath, workers } =
    await getCommandParameters(appName)

  if (!credentials) {
    return { stderr: 'Unable to repair game, no credentials', stdout: '' }
  }

  const commandParts = [
    'repair',
    appName,
    '--platform',
    installPlatform!,
    `--path=${gameData.install.install_path}`,
    '--token',
    `"${credentials.access_token}"`,
    withDlcs,
    `--lang=${gameData.install.language || 'en-US'}`,
    '-b=' + gameData.install.buildId,
    ...workers
  ]

  const res = await runGogdlCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      logMessagePrefix: `Repairing ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.error) {
    logError(['Failed to repair', `${appName}:`, res.error], LogPrefix.Gog)
  }

  return res
}

export async function syncSaves(
  appName: string,
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

  const gameInfo = getGogLibraryGameInfo(appName)
  if (!gameInfo || !gameInfo.install.platform) {
    return 'Unable to sync saves, game info not found'
  }

  let fullOutput = ''

  for (const location of gogSaves) {
    const commandParts = [
      'save-sync',
      location.location,
      appName,
      '--token',
      `"${credentials.refresh_token}"`,
      '--os',
      gameInfo.install.platform,
      '--ts',
      syncStore.get(`${appName}.${location.name}`, '0'),
      '--name',
      location.name,
      arg
    ]

    logInfo([`Syncing saves for ${gameInfo.title}`], LogPrefix.Gog)

    const res = await runGogdlCommand(
      commandParts,
      createAbortController(appName),
      {
        logMessagePrefix: `Syncing saves for ${gameInfo.title}`,
        onOutput: (output) => (fullOutput += output)
      }
    )

    deleteAbortController(appName)

    if (res.error) {
      logError(
        ['Failed to sync saves for', `${appName}`, `${res.error}`],
        LogPrefix.Gog
      )
    }
    if (res.stdout) {
      syncStore.set(`${appName}.${location.name}`, res.stdout.trim())
    }
  }

  return fullOutput
}

export async function uninstall({ appName }: RemoveArgs): Promise<ExecResult> {
  const array = installedGamesStore.get('installed', [])
  const index = array.findIndex((game) => game.appName === appName)
  if (index === -1) {
    throw Error("Game isn't installed")
  }

  const [object] = array.splice(index, 1)
  logInfo(['Removing', object.install_path], LogPrefix.Gog)
  // Run unins000.exe /verysilent /dir=Z:/path/to/game
  const uninstallerPath = join(object.install_path, 'unins000.exe')

  const res: ExecResult = { stdout: '', stderr: '' }
  if (existsSync(uninstallerPath)) {
    const gameSettings = GameConfig.get(appName).config

    const installDirectory = isWindows
      ? object.install_path
      : await getWinePath({
          path: object.install_path,
          gameSettings
        })

    const command = [
      uninstallerPath,
      '/verysilent',
      `/dir=${shlex.quote(installDirectory)}`
    ]

    logInfo(['Executing uninstall command', command.join(' ')], LogPrefix.Gog)

    if (!isWindows) {
      runWineCommandUtil({
        gameSettings,
        commandParts: command,
        wait: true,
        protonVerb: 'waitforexitandrun'
      })
    } else {
      const adminCommand = [
        'Start-Process',
        '-FilePath',
        uninstallerPath,
        '-Verb',
        'RunAs',
        '-ArgumentList'
      ]

      await spawnAsync('powershell', [
        ...adminCommand,
        `/verysilent /dir=${shlex.quote(installDirectory)}`
      ])
    }
  } else {
    if (existsSync(object.install_path))
      rmSync(object.install_path, { recursive: true })
  }
  installedGamesStore.set('installed', array)
  refreshInstalled()
  const gameInfo = getGameInfo(appName)
  await removeShortcutsUtil(gameInfo)
  syncStore.delete(appName)
  await removeNonSteamGame({ gameInfo })
  sendFrontendMessage('refreshLibrary', 'gog')
  return res
}

export async function update(
  appName: string
): Promise<{ status: 'done' | 'error' }> {
  const { installPlatform, gameData, credentials, withDlcs, logPath, workers } =
    await getCommandParameters(appName)
  if (!installPlatform || !credentials) {
    return { status: 'error' }
  }

  const commandParts = [
    'update',
    appName,
    '--platform',
    installPlatform,
    `--path=${gameData.install.install_path}`,
    '--token',
    `"${credentials.access_token}"`,
    withDlcs,
    `--lang=${gameData.install.language || 'en-US'}`,
    ...workers
  ]

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(appName, 'updating', data)
  }

  const res = await runGogdlCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Updating ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.abort) {
    return { status: 'done' }
  }

  if (res.error) {
    logError(['Failed to update', `${appName}:`, res.error], LogPrefix.Gog)
    sendFrontendMessage('gameStatusUpdate', {
      appName: appName,
      runner: 'gog',
      status: 'done'
    })
    return { status: 'error' }
  }

  const installedArray = installedGamesStore.get('installed', [])
  const gameIndex = installedArray.findIndex(
    (value) => appName === value.appName
  )
  const gameObject = installedArray[gameIndex]

  if (gameData.install.platform !== 'linux') {
    const installInfo = await getInstallInfo(appName)
    const { etag } = await getMetaResponse(
      appName,
      gameData.install.platform ?? 'windows',
      installInfo?.manifest.versionEtag
    )
    if (installInfo === undefined) return { status: 'error' }
    gameObject.buildId = installInfo.game.buildId
    gameObject.version = installInfo.game.version
    gameObject.versionEtag = etag
    gameObject.install_size = getFileSize(installInfo.manifest.disk_size)
  } else {
    const installerInfo = await getLinuxInstallerInfo(appName)
    if (!installerInfo) {
      return { status: 'error' }
    }
    gameObject.version = installerInfo.version
  }
  installedGamesStore.set('installed', installedArray)
  refreshInstalled()
  sendFrontendMessage('gameStatusUpdate', {
    appName: appName,
    runner: 'gog',
    status: 'done'
  })
  return { status: 'done' }
}

/**
 * Reads game installed data and returns proper parameters
 * Useful for Update and Repair
 */
async function getCommandParameters(appName: string) {
  const { maxWorkers } = GlobalConfig.get().getSettings()
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
  const gameData = getGameInfo(appName)
  const logPath = join(gamesConfigPath, appName + '.log')
  const credentials = await GOGUser.getCredentials()

  const withDlcs = gameData.install.installedWithDLCs
    ? '--with-dlcs'
    : '--skip-dlcs'

  const installPlatform = gameData.install.platform

  return {
    withDlcs,
    workers,
    installPlatform,
    logPath,
    credentials,
    gameData
  }
}

export async function forceUninstall(appName: string): Promise<void> {
  const installed = installedGamesStore.get('installed', [])
  const newInstalled = installed.filter((g) => g.appName !== appName)
  installedGamesStore.set('installed', newInstalled)
  sendFrontendMessage('refreshLibrary', 'gog')
}

// Could be removed if gogdl handles SIGKILL and SIGTERM for us
// which is send via AbortController
export async function stop(appName: string, stopWine = true): Promise<void> {
  const pattern = isLinux ? appName : 'gogdl'
  killPattern(pattern)

  if (stopWine && !isNative(appName)) {
    const gameSettings = await getSettings(appName)
    await shutdownWine(gameSettings)
  }
}

export function isGameAvailable(appName: string) {
  const info = getGameInfo(appName)
  if (info && info.is_installed) {
    if (info.install.install_path && existsSync(info.install.install_path!)) {
      return true
    } else {
      return false
    }
  }
  return false
}

async function postPlaytimeSession({
  appName,
  session_date,
  time
}: GOGSessionSyncQueueItem) {
  const userData: UserData | undefined = configStore.get_nodefault('userData')
  if (!userData) {
    logError('No userData, unable to post new session', {
      prefix: LogPrefix.Gog
    })
    return null
  }
  const credentials = await GOGUser.getCredentials().catch(() => null)

  if (!credentials) {
    logError("Couldn't fetch credentials, unable to post new session", {
      prefix: LogPrefix.Gog
    })
    return null
  }

  return axios
    .post(
      `https://gameplay.gog.com/games/${appName}/users/${userData?.galaxyUserId}/sessions`,
      { session_date, time },
      {
        headers: {
          Authorization: `Bearer ${credentials.access_token}`
        }
      }
    )
    .catch((e: AxiosError) => {
      logDebug(['Failed to post session', e.toJSON()], {
        prefix: LogPrefix.Gog
      })
      return null
    })
}

export async function updateGOGPlaytime(
  appName: string,
  startPlayingDate: Date,
  finishedPlayingDate: Date
) {
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
    alreadySetData.push({ ...data, appName })
    playtimeSyncQueue.set(userData.galaxyUserId, alreadySetData)
    runOnceWhenOnline(syncQueuedPlaytimeGOG)
    return
  }

  const response = await postPlaytimeSession({ ...data, appName })

  if (!response || response.status !== 201) {
    logError('Failed to post session', { prefix: LogPrefix.Gog })
    const alreadySetData = playtimeSyncQueue.get(userData.galaxyUserId, [])
    alreadySetData.push({ ...data, appName })
    playtimeSyncQueue.set(userData.galaxyUserId, alreadySetData)
    return
  }

  logInfo('Posted session to gameplay.gog.com', { prefix: LogPrefix.Gog })
}

export async function syncQueuedPlaytimeGOG() {
  if (playtimeSyncQueue.has('lock')) {
    return
  }
  playtimeSyncQueue.set('lock', [])
  const userData: UserData | undefined = configStore.get_nodefault('userData')
  if (!userData) {
    logError('Unable to syncQueued playtime, userData not present', {
      prefix: LogPrefix.Gog
    })
    return
  }
  const queue = playtimeSyncQueue.get(userData.galaxyUserId, [])
  const failed = []

  for (const session of queue) {
    if (!isOnline()) {
      failed.push(session)
    }
    const response = await postPlaytimeSession(session)

    if (!response || response.status !== 201) {
      logError('Failed to post session', { prefix: LogPrefix.Gog })
      failed.push(session)
    }
  }
  playtimeSyncQueue.set(userData.galaxyUserId, failed)
  playtimeSyncQueue.delete('lock')
  logInfo(
    ['Finished posting sessions to gameplay.gog.com', 'failed:', failed.length],
    {
      prefix: LogPrefix.Gog
    }
  )
}

export async function getGOGPlaytime(
  appName: string
): Promise<number | undefined> {
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
      `https://gameplay.gog.com/games/${appName}/users/${userData?.galaxyUserId}/sessions`,
      {
        headers: {
          Authorization: `Bearer ${credentials.access_token}`
        }
      }
    )
    .catch((e: AxiosError) => {
      logWarning(['Failed attempt to get playtime of', appName, e.toJSON()], {
        prefix: LogPrefix.Gog
      })
      return null
    })

  return response?.data?.time_sum
}
