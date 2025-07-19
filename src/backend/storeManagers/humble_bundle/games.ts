import LogWriter from 'backend/logger/log_writer'
import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import { GOGCloudSavesLocation } from 'common/types/gog'
import { apiInfoCache, libraryStore } from './electronStores'
import { downloadAndExtract, findMainGameExecutable } from './downloader'
import {
  getPathDiskSize,
  killPattern,
  sendProgressUpdate,
  shutdownWine
} from 'backend/utils'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { promises as fs } from 'fs'
import {
  checkIfInstaller,
  getGameExecutableFromProgramFiles,
  getGameExecutableFromShortcuts,
  installAllMSIFiles,
  setup
} from './setup'
import { GameConfig } from 'backend/game_config'
import { launchGame, runSetupCommand } from '../storeManagerCommon/games'
import { getRunnerLogWriter } from 'backend/logger'
import { exec } from 'child_process'

function getProductFromAppName(appName: string) {
  const products = apiInfoCache.get('humble_api_info') || {}
  const product = products[appName]

  return product
}

function getDownloadUrl(appName: string) {
  const product = getProductFromAppName(appName)
  const url = product.downloads.find((url) => url.platform == 'windows')
    ?.download_struct?.[0]?.url?.web
  return url
}

export async function getSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export function getGameInfo(appName: string): GameInfo {
  const games = libraryStore.get('games')
  const game = (games?.find((game) => game.app_name == appName) ||
    {}) as GameInfo
  return game
}

export function saveGameInfo(gameInfo: GameInfo) {
  const games = libraryStore.get('games') || []
  const gameIndex = games
    ?.map((game) => game.app_name)
    .indexOf(gameInfo.app_name)

  if (gameIndex == -1) {
    games.push(gameInfo)
  } else {
    games[gameIndex] = gameInfo
  }

  libraryStore.set('games', games)
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const product = getProductFromAppName(appName)
  return {
    reqs: [],
    about: {
      description: product?.display_item?.['description-text'] || '',
      shortDescription: product?.display_item?.['description-text'] || ''
    }
  }
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  console.log('importGame called with:', { appName, path, platform })
  return {} as ExecResult
}

export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
): void {
  console.log('onInstallOrUpdateOutput called with:', {
    appName,
    action,
    data,
    totalDownloadSize
  })
}

export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  const url = getDownloadUrl(appName)
  if (!url) {
    // TODO(alex-min): i18n errors?
    return { status: 'error', error: 'No download url found' }
  }

  const games = libraryStore.get('games')
  if (!games) {
    return { status: 'error', error: 'err' }
  }

  const game = games.find((game) => game.app_name == appName)

  if (!game) {
    return { status: 'error', error: 'err' }
  }
  try {
    const path = join(args.path, game.folder_name || '')
    await mkdir(path, { recursive: true })

    const sizeOnDisk = await getPathDiskSize(
      join(args.path, game.folder_name || '')
    )
    console.log({ sizeOnDisk })
    const install_path = join(args.path, game.folder_name || '')

    game.install = {
      platform: 'Windows',
      executable: '',
      install_path,
      install_size: '',
      is_dlc: false,
      version: '', // TODO(alex-min): change
      appName,
      installedDLCs: []
    }
    game.is_installed = true

    libraryStore.set('games', games)

    await downloadAndExtract(url, install_path, (progress) => {
      sendProgressUpdate({
        appName,
        runner: 'humble-bundle',
        status: 'installing',
        progress
      })
    })

    const executable = await findMainGameExecutable(game, install_path)
    const gameInfo = {
      ...game,
      install: {
        ...game.install,
        executable: executable || undefined,
        install_size: '1MB' // TODO(alex-min): change
      }
    }
    await setup(gameInfo)

    const msiFiles = await installAllMSIFiles(game, install_path)
    //

    let installer = false

    if (!executable && msiFiles.length > 0) {
      installer = true
    }

    if (executable && (await checkIfInstaller(executable))) {
      installer = true
      sendProgressUpdate({
        appName: gameInfo.app_name,
        runner: 'humble-bundle',
        status: 'installing'
      })
      await runSetupCommand({
        commandParts: [executable, '/silent'],
        gameSettings: await getSettings(gameInfo.app_name),
        wait: true,
        protonVerb: 'run',
        gameInstallPath: gameInfo.install.install_path,
        startFolder: gameInfo.install.install_path
      })
      gameInfo.install.executable = undefined
    }

    if (installer) {
      gameInfo.install.executable =
        (await getGameExecutableFromShortcuts(gameInfo)) || undefined
    }

    if (!gameInfo.install.executable) {
      let exec = await getGameExecutableFromProgramFiles(gameInfo)
      gameInfo.install.executable = exec || undefined
    }

    await saveGameInfo(gameInfo)

    sendProgressUpdate({
      appName,
      runner: 'humble-bundle',
      status: 'installed'
    })

    return { status: 'done' }
  } catch (e) {
    console.error(e)
    game.is_installed = false
    game.install = {}
    libraryStore.set('games', games)
    sendProgressUpdate({
      appName,
      runner: 'humble-bundle',
      status: 'error'
    })
    return { status: 'error', error: 'install failed' }
  }
}

export function isNative(appName: string): boolean {
  console.log('isNative called with:', { appName })
  return false
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  console.log('addShortcuts called with:', { appName, fromMenu })
}

export async function removeShortcuts(appName: string): Promise<void> {
  console.log('removeShortcuts called with:', { appName })
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args?: string[],
  skipVersionCheck?: boolean
): Promise<boolean> {
  return launchGame(
    appName,
    logWriter,
    getGameInfo(appName),
    'humble-bundle',
    args
  )
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  console.log('moveInstall called with:', { appName, newInstallPath })
  return {} as InstallResult
}

export async function repair(appName: string): Promise<ExecResult> {
  console.log('repair called with:', { appName })
  return {} as ExecResult
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[]
): Promise<string> {
  console.log('syncSaves called with:', { appName, arg, path, gogSaves })
  return ''
}

export async function uninstall({ appName }: RemoveArgs): Promise<ExecResult> {
  getProductFromAppName(appName)
  const gameInfo = getGameInfo(appName)
  const install_path = gameInfo.install?.install_path
  if (!install_path) {
    throw new Error('not installed')
  }
  // TODO(alex-min): error management
  //  await fs.rm(install_path, { recursive: true, force: true })
  await saveGameInfo({ ...gameInfo, install: {}, is_installed: false })
  sendProgressUpdate({
    appName,
    runner: 'humble-bundle',
    status: 'notInstalled'
  })
  return { stderr: '', stdout: '' }
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
): Promise<InstallResult> {
  console.log('update called with:', { appName, updateOverwrites })
  return {} as InstallResult
}

export async function forceUninstall(appName: string): Promise<void> {
  console.log('forceUninstall called with:', { appName })
}

export async function stop(appName: string): Promise<void> {
  const {
    install: { executable = undefined }
  } = getGameInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)

    if (!isNative(appName)) {
      const gameSettings = await getSettings(appName)
      shutdownWine(gameSettings)
    }
  }
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  const executable = getGameInfo(appName).install?.executable
  if (!executable) {
    return false
  }
  try {
    await fs.access(executable)
    return true
  } catch {
    return false
  }
}
