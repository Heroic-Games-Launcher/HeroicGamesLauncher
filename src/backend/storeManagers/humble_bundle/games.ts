import LogWriter from 'backend/logger/log_writer'
import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  LaunchOption
} from 'common/types'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import { apiInfoCache, libraryStore } from './electronStores'
import { downloadAndExtract, findMainGameExecutable } from './downloader'
import {
  killPattern,
  sendGameStatusUpdate,
  sendProgressUpdate,
  shutdownWine
} from 'backend/utils'
import { dirname, join } from 'path'
import { mkdir } from 'fs/promises'
import { promises as fs } from 'fs'
import {
  checkIfInstaller,
  getGameExecutableFromProgramFiles,
  getGameExecutableFromShortcuts,
  installAllMSIFiles,
  setup,
  silentInstallOption
} from './setup'
import { GameConfig } from 'backend/game_config'
import { launchGame, runSetupCommand } from '../storeManagerCommon/games'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { verifyWinePrefix } from 'backend/launcher'
import { isWindows } from 'backend/constants/environment'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { removeRecentGame } from 'backend/recent_games/recent_games'
import { removePrefix } from 'backend/utils/uninstaller'

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

export async function importGame(): Promise<ExecResult> {
  return { stderr: '', stdout: '' }
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
  const product = getProductFromAppName(appName)
  const url = getDownloadUrl(appName)
  if (!product || !url) {
    return { status: 'error' }
  }

  const games = libraryStore.get('games')
  if (!games) {
    return { status: 'error' }
  }

  const game = games.find((game) => game.app_name == appName)

  if (!game) {
    return { status: 'error' }
  }
  try {
    const path = join(args.path, game.folder_name || '')
    await mkdir(path, { recursive: true })

    const install_path = join(args.path, game.folder_name || '')

    game.install = {
      platform: 'Windows',
      executable: '',
      install_path,
      install_size: '',
      is_dlc: false,
      version: '',
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
        install_size:
          product.downloads.find((url) => url.platform == 'windows')
            ?.download_struct?.[0]?.human_size || ''
      }
    }
    await setup(gameInfo)
    if (!isWindows) {
      await verifyWinePrefix(await getSettings(gameInfo.app_name))
    }

    const msiFiles = await installAllMSIFiles(game, install_path)

    let installer = false

    if (!executable && msiFiles.length > 0) {
      installer = true
    }

    const installerKind = await checkIfInstaller(executable)
    if (installerKind && executable) {
      sendProgressUpdate({
        appName: gameInfo.app_name,
        runner: 'humble-bundle',
        status: 'installing'
      })
      await runSetupCommand({
        commandParts: [executable, ...silentInstallOption[installerKind]],
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
      const exec = await getGameExecutableFromProgramFiles(gameInfo)
      gameInfo.install.executable = exec || undefined
    }

    saveGameInfo(gameInfo)

    sendProgressUpdate({
      appName,
      runner: 'humble-bundle',
      status: 'installed'
    })

    return { status: 'done' }
  } catch (e) {
    logError(`Unable to install game ${appName}: ${e}`, LogPrefix.Backend)
    console.error(e)
    game.is_installed = false
    game.install = {}
    libraryStore.set('games', games)
    sendProgressUpdate({
      appName,
      runner: 'humble-bundle',
      status: 'error'
    })
    return { status: 'error' }
  }
}

export function isNative(): boolean {
  // The humble integration only supports windows games at the moment
  return isWindows
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

export async function removeShortcuts(appName: string): Promise<void> {
  return removeShortcutsUtil(getGameInfo(appName))
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args?: string[]
): Promise<boolean> {
  return launchGame(
    appName,
    logWriter,
    getGameInfo(appName),
    'humble-bundle',
    args
  )
}

export async function moveInstall(appName: string): Promise<InstallResult> {
  logWarning(
    `moveInstall not implemented on Humble Bundle. called for appName = ${appName}`
  )
  return { status: 'error' }
}

export async function repair(appName: string): Promise<ExecResult> {
  const gameInfo = getGameInfo(appName)
  await verifyWinePrefix(await getSettings(gameInfo.app_name))
  return { stderr: '', stdout: '' }
}

export async function syncSaves(): Promise<string> {
  // there's no online saves with humble bundle
  return ''
}

export async function uninstall({
  appName,
  shouldRemovePrefix,
  deleteFiles = false
}: RemoveArgs): Promise<ExecResult> {
  sendGameStatusUpdate({
    appName,
    runner: 'humble-bundle',
    status: 'uninstalling'
  })

  const old = libraryStore.get('games', [])
  const current = old.filter((a: GameInfo) => a.app_name !== appName)

  const gameInfo = getGameInfo(appName)
  const {
    install: { executable }
  } = gameInfo

  if (shouldRemovePrefix) {
    removePrefix(appName, 'humble-bundle')
  }
  libraryStore.set('games', current)

  if (deleteFiles && executable !== undefined) {
    fs.rmdir(dirname(executable), { recursive: true })
  }

  removeShortcutsUtil(gameInfo)
  removeRecentGame(appName)

  sendGameStatusUpdate({
    appName,
    runner: 'humble-bundle',
    status: 'done'
  })

  logInfo('finished uninstalling', LogPrefix.Backend)
  return { stderr: '', stdout: '' }
}

export async function update(): Promise<InstallResult> {
  return { status: 'error' }
}

export async function forceUninstall(appName: string): Promise<void> {
  logWarning(
    `forceUninstall not implemented on Humble. called for appName = ${appName}`
  )
}

export async function stop(appName: string): Promise<void> {
  const {
    install: { executable = undefined }
  } = getGameInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)

    if (!isNative()) {
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
