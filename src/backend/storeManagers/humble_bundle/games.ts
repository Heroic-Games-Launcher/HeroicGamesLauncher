import LogWriter from 'backend/logger/log_writer'
import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  LaunchOption
} from 'common/types'
import { Game, InstallResult, RemoveArgs } from 'common/types/game_manager'
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

export function getGameInfo(appName: string): GameInfo | undefined {
  const games = libraryStore.get('games')
  return games?.find((game) => game.app_name == appName)
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

export default class HumbleBundleGame implements Game {
  private readonly appName: string

  constructor(appName: string) {
    this.appName = appName
  }

  async getSettings(): Promise<GameSettings> {
    return getSettings(this.appName)
  }

  getGameInfo(): GameInfo {
    const game = getGameInfo(this.appName)
    if (!game) {
      logError(
        [
          'Could not get game info for',
          `${this.appName},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        LogPrefix.HumbleBundle
      )
      return {
        app_name: '',
        runner: 'humble-bundle',
        art_cover: '',
        art_square: '',
        install: {},
        is_installed: false,
        title: '',
        canRunOffline: false
      }
    }
    return game
  }

  async getExtraInfo(): Promise<ExtraInfo> {
    const product = getProductFromAppName(this.appName)
    return {
      reqs: [],
      about: {
        description: product?.display_item?.['description-text'] || '',
        shortDescription: product?.display_item?.['description-text'] || ''
      }
    }
  }

  async importGame(): Promise<ExecResult> {
    return { stderr: '', stdout: '' }
  }

  onInstallOrUpdateOutput(): void {
    // Humble Bundle downloads report progress directly through
    // sendProgressUpdate in install(), so there's nothing to parse here.
  }

  async install(args: InstallArgs): Promise<InstallResult> {
    const appName = this.appName
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
        await verifyWinePrefix(await this.getSettings())
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
          gameSettings: await this.getSettings(),
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
      logError(
        `Unable to install game ${appName}: ${e}`,
        LogPrefix.HumbleBundle
      )
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

  isNative(): boolean {
    // The humble integration only supports windows games at the moment
    return isWindows
  }

  async addShortcuts(fromMenu?: boolean): Promise<void> {
    return addShortcutsUtil(this, fromMenu)
  }

  async removeShortcuts(): Promise<void> {
    return removeShortcutsUtil(this)
  }

  async launch(
    logWriter: LogWriter,
    launchArguments?: LaunchOption,
    args?: string[]
  ): Promise<boolean> {
    return launchGame(this, logWriter, args)
  }

  async moveInstall(): Promise<InstallResult> {
    logWarning(
      `moveInstall not implemented on Humble Bundle. called for appName = ${this.appName}`,
      LogPrefix.HumbleBundle
    )
    return { status: 'error' }
  }

  async repair(): Promise<ExecResult> {
    await verifyWinePrefix(await this.getSettings())
    return { stderr: '', stdout: '' }
  }

  async syncSaves(): Promise<string> {
    // there's no online saves with humble bundle
    return ''
  }

  async uninstall({
    shouldRemovePrefix,
    deleteFiles = false
  }: RemoveArgs): Promise<ExecResult> {
    const appName = this.appName
    sendGameStatusUpdate({
      appName,
      runner: 'humble-bundle',
      status: 'uninstalling'
    })

    const old = libraryStore.get('games', [])
    const current = old.filter((a: GameInfo) => a.app_name !== appName)

    const gameInfo = this.getGameInfo()
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

    removeShortcutsUtil(this)
    removeRecentGame(appName)

    sendGameStatusUpdate({
      appName,
      runner: 'humble-bundle',
      status: 'done'
    })

    logInfo('finished uninstalling', LogPrefix.HumbleBundle)
    return { stderr: '', stdout: '' }
  }

  async update(): Promise<InstallResult> {
    return { status: 'error' }
  }

  async forceUninstall(): Promise<void> {
    logWarning(
      `forceUninstall not implemented on Humble. called for appName = ${this.appName}`,
      LogPrefix.HumbleBundle
    )
  }

  async stop(): Promise<void> {
    const {
      install: { executable = undefined }
    } = this.getGameInfo()

    if (executable) {
      const split = executable.split('/')
      const exe = split[split.length - 1]
      killPattern(exe)

      if (!this.isNative()) {
        const gameSettings = await this.getSettings()
        shutdownWine(gameSettings)
      }
    }
  }

  async isGameAvailable(): Promise<boolean> {
    const executable = this.getGameInfo().install?.executable
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
}
