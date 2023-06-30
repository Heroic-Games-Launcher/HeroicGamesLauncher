import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { appendFileSync, existsSync } from 'graceful-fs'
import axios from 'axios'

import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  InstallArgs,
  InstallPlatform,
  InstallProgress,
  WineCommandArgs
} from 'common/types'
import { GameConfig } from '../../game_config'
import { GlobalConfig } from '../../config'
import {
  runRunnerCommand as runLegendaryCommand,
  getInstallInfo,
  listUpdateableGames,
  getGameInfo as getLegLibraryGameInfo,
  changeGameInstallPath,
  installState
} from './library'
import { LegendaryUser } from './user'
import {
  getLegendaryBin,
  killPattern,
  moveOnUnix,
  moveOnWindows,
  shutdownWine
} from '../../utils'
import {
  isMac,
  isWindows,
  installed,
  configStore,
  gamesConfigPath,
  isLinux,
  isFlatpak,
  isCLINoGui
} from '../../constants'
import { logError, logInfo, LogPrefix, logsDisabled } from '../../logger/logger'
import {
  prepareLaunch,
  prepareWineLaunch,
  setupEnvVars,
  setupWrappers,
  launchCleanup,
  getRunnerCallWithoutCredentials,
  runWineCommand as runWineCommandUtil
} from '../../launcher'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { join } from 'path'
import { gameInfoStore } from './electronStores'
import { removeNonSteamGame } from '../../shortcuts/nonesteamgame/nonesteamgame'
import shlex from 'shlex'
import { t } from 'i18next'
import { isOnline } from '../../online_monitor'
import { showDialogBoxModalAuto } from '../../dialog/dialog'
import { gameAnticheatInfo } from '../../anticheat/utils'
import { Catalog, Product } from 'common/types/epic-graphql'
import { sendFrontendMessage } from '../../main_window'
import { RemoveArgs } from 'common/types/game_manager'
import { logFileLocation } from 'backend/storeManagers/storeManagerCommon/games'
import { getWineFlags } from 'backend/utils/compatibility_layers'

/**
 * Alias for `LegendaryLibrary.listUpdateableGames`
 */
export async function checkGameUpdates() {
  const isLoggedIn = LegendaryUser.isLoggedIn()
  if (!isLoggedIn) {
    return []
  }
  return listUpdateableGames()
}

/**
 * Alias for `LegendaryLibrary.getGameInfo(appName)`
 *
 * @returns GameInfo
 */
export function getGameInfo(appName: string): GameInfo {
  const info = getLegLibraryGameInfo(appName)
  if (!info) {
    logError(
      [
        'Could not get game info for',
        `${appName},`,
        'returning empty object. Something is probably gonna go wrong soon'
      ],
      LogPrefix.Legendary
    )
    return {
      app_name: '',
      runner: 'legendary',
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

async function getProductSlug(namespace: string, title: string) {
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
      return slugFromTitle(title)
    }
  } catch (error) {
    logError(error, LogPrefix.Legendary)
    return slugFromTitle(title)
  }
}

async function getExtraFromAPI(slug: string): Promise<ExtraInfo | null> {
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

async function getExtraFromGraphql(
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

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replaceAll(' ', '-')
}

const emptyExtraInfo = {
  about: {
    description: '',
    shortDescription: ''
  },
  reqs: [],
  storeUrl: ''
}
/**
 * Get extra info from Epic's API.
 *
 */
export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const { namespace, title } = getGameInfo(appName)
  if (namespace === undefined) return emptyExtraInfo
  const cachedExtraInfo = gameInfoStore.get(namespace)
  if (cachedExtraInfo) {
    return cachedExtraInfo
  }
  if (!isOnline()) {
    return emptyExtraInfo
  }

  const slug = await getProductSlug(namespace, title)

  // try the API first, it works for most games
  let extraData = await getExtraFromAPI(slug)

  // if the API doesn't work, try graphql
  if (!extraData) {
    extraData = await getExtraFromGraphql(namespace, slug)
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
 * Alias for `GameConfig.get(appName).config`
 * If it doesn't exist, uses getSettings() instead.
 *
 * @returns GameConfig
 */
export async function getSettings(appName: string) {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

/**
 * Parent folder to move app to.
 * Amends install path by adding the appropriate folder name.
 */
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
      LogPrefix.Legendary
    )

    return { status: 'error', error }
  }

  await changeGameInstallPath(appName, moveResult.installPath)
  return { status: 'done' }
}

// used when downloading games, store the download size read from Legendary's output
interface currentDownloadSizeMap {
  [key: string]: number
}
const currentDownloadSize: currentDownloadSizeMap = {}

export function getCurrentDownloadSize(appName: string) {
  return currentDownloadSize[appName]
}

export function setCurrentDownloadSize(appName: string, size: number) {
  return (currentDownloadSize[appName] = size)
}

interface tmpProgressMap {
  [key: string]: InstallProgress
}

function defaultTmpProgres() {
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
  totalDownloadSize: number
) {
  const downloadSizeMatch = data.match(/Download size: ([\d.]+) MiB/)

  // store the download size, needed for correct calculation
  // when cancel/resume downloads
  if (downloadSizeMatch) {
    currentDownloadSize[appName] = parseFloat(downloadSizeMatch[1])
  }

  if (!Object.hasOwn(tmpProgress, appName)) {
    tmpProgress[appName] = defaultTmpProgres()
  }

  const progress = tmpProgress[appName]

  // parse log for eta
  if (progress.eta === '') {
    const etaMatch = data.match(/ETA: (\d\d:\d\d:\d\d)/m)
    progress.eta = etaMatch && etaMatch?.length >= 2 ? etaMatch[1] : ''
  }

  // parse log for game download progress
  if (progress.bytes === '') {
    const bytesMatch = data.match(/Downloaded: (\S+.) MiB/m)
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

  // original is in bytes, convert to MiB with 2 decimals
  totalDownloadSize = Math.round((totalDownloadSize / 1024 / 1024) * 100) / 100

  // calculate percentage
  if (progress.bytes !== '') {
    const downloaded = parseFloat(progress.bytes)
    const downloadCache = totalDownloadSize - currentDownloadSize[appName]
    const totalDownloaded = downloaded + downloadCache
    const newPercent =
      Math.round((totalDownloaded / totalDownloadSize) * 10000) / 100
    progress.percent = newPercent >= 0 ? newPercent : undefined
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
      LogPrefix.Legendary
    )

    sendFrontendMessage(`progressUpdate-${appName}`, {
      appName: appName,
      runner: 'legendary',
      status: action,
      progress: progress
    })

    // reset
    tmpProgress[appName] = defaultTmpProgres()
  }
}

/**
 * Update game.
 * Does NOT check for online connectivity.
 */
export async function update(
  appName: string
): Promise<{ status: 'done' | 'error' }> {
  sendFrontendMessage('gameStatusUpdate', {
    appName: appName,
    runner: 'legendary',
    status: 'updating'
  })
  const { maxWorkers, downloadNoHttps } = GlobalConfig.get().getSettings()
  const installPlatform = getGameInfo(appName).install.platform!
  const info = await getInstallInfo(appName, installPlatform)
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
  const noHttps = downloadNoHttps ? ['--no-https'] : []
  const logPath = join(gamesConfigPath, appName + '.log')

  const commandParts = ['update', appName, ...workers, ...noHttps, '-y']

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(
      appName,
      'updating',
      data,
      info.manifest?.download_size
    )
  }

  const res = await runLegendaryCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Updating ${appName}`
    }
  )

  deleteAbortController(appName)

  sendFrontendMessage('gameStatusUpdate', {
    appName: appName,
    runner: 'legendary',
    status: 'done'
  })

  if (res.error) {
    logError(
      ['Failed to update', `${appName}:`, res.error],
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
export async function addShortcuts(appName: string, fromMenu?: boolean) {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

/**
 * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
 * @async
 * @public
 */
export async function removeShortcuts(appName: string) {
  return removeShortcutsUtil(getGameInfo(appName))
}

function getSdlList(sdlList: Array<string>) {
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
export async function install(
  appName: string,
  { path, sdlList, platformToInstall }: InstallArgs
): Promise<{
  status: 'done' | 'error' | 'abort'
  error?: string
}> {
  const { maxWorkers, downloadNoHttps } = GlobalConfig.get().getSettings()
  const info = await getInstallInfo(appName, platformToInstall)
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
  const noHttps = downloadNoHttps ? ['--no-https'] : []
  const installSdl = sdlList?.length ? getSdlList(sdlList) : ['--skip-sdl']

  const logPath = join(gamesConfigPath, appName + '.log')

  const commandParts = [
    'install',
    appName,
    '--platform',
    platformToInstall,
    '--base-path',
    path,
    '--skip-dlcs',
    ...installSdl,
    ...workers,
    ...noHttps,
    '-y'
  ]

  const onOutput = (data: string) => {
    onInstallOrUpdateOutput(
      appName,
      'installing',
      data,
      info.manifest?.download_size
    )
  }

  let res = await runLegendaryCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      onOutput,
      logMessagePrefix: `Installing ${appName}`
    }
  )

  deleteAbortController(appName)

  // try to run the install again with higher memory limit
  if (res.stderr.includes('MemoryError:')) {
    res = await runLegendaryCommand(
      [...commandParts, '--max-shared-memory', '5000'],
      createAbortController(appName),
      {
        logFile: logPath,
        onOutput
      }
    )

    deleteAbortController(appName)
  }

  if (res.abort) {
    return { status: 'abort' }
  }

  if (res.error) {
    if (!res.error.includes('signal')) {
      logError(
        ['Failed to install', `${appName}:`, res.error],
        LogPrefix.Legendary
      )
    }
    return { status: 'error', error: res.error }
  }
  addShortcuts(appName)

  const anticheatInfo = gameAnticheatInfo(getGameInfo(appName).namespace)

  if (anticheatInfo && isLinux) {
    const gameSettings = await getSettings(appName)

    gameSettings.eacRuntime =
      anticheatInfo.anticheats.includes('Easy Anti-Cheat')
    if (gameSettings.eacRuntime && isFlatpak) gameSettings.useGameMode = true
    gameSettings.battlEyeRuntime = anticheatInfo.anticheats.includes('BattlEye')
  }

  return { status: 'done' }
}

export async function uninstall({ appName }: RemoveArgs): Promise<ExecResult> {
  const commandParts = ['uninstall', appName, '-y']

  const res = await runLegendaryCommand(
    commandParts,
    createAbortController(appName),
    {
      logMessagePrefix: `Uninstalling ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.error) {
    logError(
      ['Failed to uninstall', `${appName}:`, res.error],
      LogPrefix.Legendary
    )
  } else if (!res.abort) {
    installState(appName, false)
    await removeShortcutsUtil(getGameInfo(appName))
    const gameInfo = getGameInfo(appName)
    await removeNonSteamGame({ gameInfo })
  }
  sendFrontendMessage('refreshLibrary', 'legendary')
  return res
}

/**
 * Repair game.
 * Does NOT check for online connectivity.
 */
export async function repair(appName: string): Promise<ExecResult> {
  const { maxWorkers, downloadNoHttps } = GlobalConfig.get().getSettings()
  const workers = maxWorkers ? ['--max-workers', `${maxWorkers}`] : []
  const noHttps = downloadNoHttps ? ['--no-https'] : []

  const logPath = join(gamesConfigPath, appName + '.log')

  const commandParts = ['repair', appName, ...workers, ...noHttps, '-y']

  const res = await runLegendaryCommand(
    commandParts,
    createAbortController(appName),
    {
      logFile: logPath,
      logMessagePrefix: `Repairing ${appName}`
    }
  )

  deleteAbortController(appName)

  if (res.error) {
    logError(
      ['Failed to repair', `${appName}:`, res.error],
      LogPrefix.Legendary
    )
  }
  return res
}

export async function importGame(
  appName: string,
  folderPath: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  const commandParts = [
    'import',
    '--with-dlcs',
    '--platform',
    platform,
    appName,
    folderPath
  ]

  logInfo(`Importing ${appName}.`, LogPrefix.Legendary)

  const res = await runLegendaryCommand(
    commandParts,
    createAbortController(appName)
  )
  addShortcuts(appName)

  deleteAbortController(appName)

  if (res.error) {
    logError(
      ['Failed to import', `${appName}:`, res.error],
      LogPrefix.Legendary
    )
  }
  return res
}

/**
 * Sync saves.
 * Does NOT check for online connectivity.
 */
export async function syncSaves(
  appName: string,
  arg: string,
  path: string
): Promise<string> {
  if (!path) {
    logError(
      'No path provided for SavesSync, check your settings!',
      LogPrefix.Legendary
    )
    return 'No path provided.'
  }

  const commandParts = ['sync-saves', arg, '--save-path', path, appName, '-y']

  let fullOutput = ''
  const res = await runLegendaryCommand(
    commandParts,
    createAbortController(appName),
    {
      logMessagePrefix: `Syncing saves for ${getGameInfo(appName).title}`,
      onOutput: (output) => (fullOutput += output)
    }
  )

  deleteAbortController(appName)

  if (res.error) {
    logError(
      ['Failed to sync saves for', `${appName}:`, res.error],
      LogPrefix.Legendary
    )
  }
  return fullOutput
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
    steamRuntime,
    offlineMode
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

  const offlineFlag = offlineMode ? ['--offline'] : []
  const exeOverrideFlag = gameSettings.targetExe
    ? ['--override-exe', gameSettings.targetExe]
    : []

  const languageCode = gameSettings.language || configStore.get('language', '')
  const languageFlag = languageCode ? ['--language', languageCode] : []

  let commandEnv = isWindows
    ? process.env
    : { ...process.env, ...setupEnvVars(gameSettings) }
  let wineFlag: string[] = []
  if (!isNative(appName)) {
    // -> We're using Wine/Proton on Linux or CX on Mac
    const {
      success: wineLaunchPrepSuccess,
      failureReason: wineLaunchPrepFailReason,
      envVars: wineEnvVars
    } = await prepareWineLaunch('legendary', appName)
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
    appName,
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
    logFileLocation(appName),
    `Launch Command: ${fullCommand}\n\nGame Log:\n`
  )

  const { error } = await runLegendaryCommand(
    commandParts,
    createAbortController(appName),
    {
      env: commandEnv,
      wrappers: wrappers,
      logMessagePrefix: `Launching ${gameInfo.title}`,
      onOutput: (output) => {
        if (!logsDisabled) appendFileSync(logFileLocation(appName), output)
      }
    }
  )

  deleteAbortController(appName)

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

export function isNative(appName: string): boolean {
  const gameInfo = getGameInfo(appName)

  if (isWindows) {
    return true
  }

  if (isMac && gameInfo?.install?.platform === 'Mac') {
    return true
  }

  return false
}

export async function forceUninstall(appName: string) {
  // Modify Legendary installed.json file:
  try {
    await runLegendaryCommand(
      ['uninstall', appName, '-y', '--keep-files'],
      createAbortController(appName)
    )

    deleteAbortController(appName)

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
export async function stop(appName: string, stopWine = true) {
  // until the legendary bug gets fixed, kill legendary on mac
  // not a perfect solution but it's the only choice for now

  // @adityaruplaha: this is kinda arbitary and I don't understand it.
  const pattern = process.platform === 'linux' ? appName : 'legendary'
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

export async function runWineCommandOnGame(
  appName: string,
  { commandParts, wait = false, protonVerb, startFolder }: WineCommandArgs
): Promise<ExecResult> {
  if (isNative(appName)) {
    logError('runWineCommand called on native game!', LogPrefix.Legendary)
    return { stdout: '', stderr: '' }
  }

  const { folder_name } = getGameInfo(appName)
  const gameSettings = await getSettings(appName)

  return runWineCommandUtil({
    gameSettings,
    installFolderName: folder_name,
    commandParts,
    wait,
    protonVerb,
    startFolder
  })
}
