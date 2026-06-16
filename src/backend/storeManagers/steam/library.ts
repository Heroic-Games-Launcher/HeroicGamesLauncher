import {
  CallRunnerOptions,
  ExecResult,
  GameInfo,
  InstallInfo,
  InstalledInfo,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { SteamDLCInfo, SteamInstallInfo } from 'common/types/steam'
import { LibraryManager } from 'common/types/game_manager'
import {
  getRunnerLogWriter,
  logDebug,
  logError,
  logInfo,
  logWarning,
  LogPrefix
} from 'backend/logger'
import { GlobalConfig } from 'backend/config'
import { getFileSize } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { isMac, isWindows } from 'backend/constants/environment'
import {
  libraryStore,
  installedGamesStore,
  installInfoStore
} from './electronStores'
import {
  runAurelia,
  runAureliaCommand,
  getSteamLibraryPath,
  AureliaError
} from './aurelia'
import { join } from 'path'
import SteamGame from './games'
import type {
  AureliaLibraryGame,
  AureliaDlcResponse,
  AureliaLaunchOptionsResponse,
  AureliaDryRunResponse
} from './aurelia_types'

const library: Map<string, GameInfo> = new Map()
const installedGames: Map<string, InstalledInfo> = new Map()

const installPlatform = isWindows ? 'windows' : isMac ? 'osx' : 'linux'

function isSteamImportEnabled(): boolean {
  return !!GlobalConfig.get().getSettings().experimentalFeatures?.steamImport
}

function describeError(error: unknown): string {
  return error instanceof AureliaError ? error.message : String(error)
}

/**
 * Steam library manager.
 */
export default class SteamLibraryManager implements LibraryManager {
  async init(): Promise<void> {
    if (!isSteamImportEnabled()) return
    await this.refresh()
  }

  getGame(id: string): SteamGame {
    return new SteamGame(id)
  }

  async runRunnerCommand(
    commandParts: string[],
    options?: CallRunnerOptions
  ): Promise<ExecResult> {
    return runAureliaCommand(commandParts, options)
  }

  async refresh(): Promise<ExecResult | null> {
    if (!isSteamImportEnabled()) {
      return { stdout: '', stderr: 'Steam import disabled' }
    }

    logInfo('Refreshing Steam library', LogPrefix.Steam)
    library.clear()
    installedGames.clear()

    let games: AureliaLibraryGame[]
    try {
      games = await runAurelia<AureliaLibraryGame[]>(['list'])
    } catch (error) {
      logError(
        ['Unable to list Steam games', describeError(error)],
        LogPrefix.Steam
      )
      return { stdout: '', stderr: 'Unable to list Steam games' }
    }

    for (const game of games) {
      const appId = String(game.app_id)
      const info = this.steamToUnifiedInfo(game)

      // The game is only shown via Steam Family sharing when the user doesn't
      // own a license for it themselves.
      if (game.is_family_shared) {
        info.isFamilyShare = true
      }

      if (game.is_installed && game.install_path) {
        const installed = this.toInstalledInfo(appId, game)
        info.is_installed = true
        info.install = installed
        installedGames.set(appId, installed)
      }

      library.set(appId, info)
      sendFrontendMessage('pushGameToLibrary', info)
    }

    installedGamesStore.set('installed', Array.from(installedGames.values()))
    libraryStore.set('games', Array.from(library.values()))

    const logLines = Array.from(library.values()).map(
      (game) =>
        `* ${game.title} (App name: ${game.app_name})${
          game.is_installed ? ' - Installed' : ''
        }`
    )
    const sortedTitles = logLines.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
    const logContent = `Games List:\n${sortedTitles.join('\n')}\n\nTotal: ${
      logLines.length
    }\n`
    void getRunnerLogWriter('steam').logInfo(logContent)

    logInfo(`Found ${library.size} Steam games`, LogPrefix.Steam)

    return { stdout: 'Library refreshed', stderr: '' }
  }

  /**
   * Builds Heroic's `InstalledInfo`
   */
  private toInstalledInfo(
    appId: string,
    game: AureliaLibraryGame
  ): InstalledInfo {
    return {
      executable: '',
      install_path: game.install_path ?? '',
      install_size: getFileSize(0),
      is_dlc: false,
      version: '',
      platform: installPlatform,
      appName: appId,
      branch: game.active_branch
    }
  }

  steamToUnifiedInfo(game: AureliaLibraryGame): GameInfo {
    const appId = String(game.app_id)
    const assets = game.assets ?? {}
    return {
      runner: 'steam',
      app_name: appId,
      title: game.name,
      art_cover: assets.header ?? '',
      art_square: assets.capsule ?? '',
      art_background: assets.hero ?? '',
      art_logo: assets.logo,
      store_url: game.store_url,
      folder_name: game.name,
      install: {},
      is_installed: false,
      canRunOffline: true,
      // Aurelia installs the Windows depots and runs them
      is_mac_native: false,
      is_linux_native: false
    }
  }

  getGameInfo(appName: string): GameInfo | undefined {
    const cached = library.get(appName)
    if (cached) {
      return cached
    }

    const games = libraryStore.get('games', [])
    const game = games.find((value) => value.app_name === appName)
    if (!game) {
      return
    }
    const installedInfo =
      installedGames.get(appName) ??
      installedGamesStore
        .get('installed', [])
        .find((value) => value.appName === appName)
    if (installedInfo) {
      game.is_installed = true
      game.install = installedInfo
    }
    return game
  }

  /**
   * Lists a Steam game's DLC with whether the user owns each one and whether its
   * files are installed, via `aurelia dlc <id>`.
   */
  async getDLCInfo(appId: string): Promise<SteamDLCInfo[]> {
    if (!isSteamImportEnabled()) {
      return []
    }

    let response: AureliaDlcResponse
    try {
      response = await runAurelia<AureliaDlcResponse>(['dlc', appId])
    } catch (error) {
      logWarning(
        [`Unable to get Steam DLC for ${appId}`, describeError(error)],
        LogPrefix.Steam
      )
      return []
    }

    const dlcs: SteamDLCInfo[] = (response.dlc ?? []).map((dlc) => ({
      appId: String(dlc.app_id),
      title: dlc.name || `DLC ${dlc.app_id}`,
      owned: !!dlc.owned,
      installed: !!dlc.installed,
      disabled: !!dlc.disabled,
      imageUrl: dlc.image_url ?? '',
      imageFallbackUrl: dlc.image_fallback_url ?? '',
      storeUrl: dlc.store_url ?? ''
    }))

    // Installed first, then owned-but-not-installed, then not owned; alphabetical
    // within each group.
    const rank = (dlc: SteamDLCInfo) => (dlc.installed ? 0 : dlc.owned ? 1 : 2)
    dlcs.sort((a, b) => rank(a) - rank(b) || (a.title < b.title ? -1 : 1))
    return dlcs
  }

  async getInstallInfo(
    appName: string,
    platform: InstallPlatform,
    // Aurelia's dry-run has no branch/build selection, so the options are unused.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: { branch?: string; build?: string; lang?: string }
  ): Promise<InstallInfo | undefined> {
    if (!isSteamImportEnabled()) {
      return undefined
    }

    // Key the cache by platform
    const cacheKey = `${appName}_${String(platform).toLowerCase()}`
    const cache = installInfoStore.get(cacheKey)
    if (cache && cache.manifest) {
      logDebug('Using cached Steam install info', LogPrefix.Steam)
      return cache
    }

    const game = this.getGameInfo(appName)
    try {
      // PICS size estimate, no files fetched.
      const lc = String(platform).toLowerCase()
      const platformArg = lc.startsWith('win')
        ? ['-p', 'windows']
        : lc.startsWith('lin')
          ? ['-p', 'linux']
          : []
      const dryRun = await runAurelia<AureliaDryRunResponse>([
        'install',
        appName,
        '--dry-run',
        ...platformArg
      ])

      const launchOptions = await this.getLaunchOptions(appName)
      const libraryPath = await getSteamLibraryPath()
      const installPath = libraryPath
        ? join(libraryPath, 'steamapps', 'common')
        : ''

      const info: SteamInstallInfo = {
        manifest: {
          download_size: dryRun.download_size,
          disk_size: dryRun.disk_size
        },
        game: {
          id: appName,
          version: '',
          path: installPath,
          app_name: appName,
          cloud_saves_supported: false,
          external_activation: '',
          is_dlc: false,
          launch_options: launchOptions,
          owned_dlc: [],
          platform_versions: {},
          title: game?.title ?? appName
        }
      }
      installInfoStore.set(cacheKey, info)
      return info
    } catch (error) {
      logError(
        [
          `Unable to get Steam install info for ${appName}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
      return undefined
    }
  }

  async listUpdateableGames(): Promise<string[]> {
    if (!isSteamImportEnabled()) {
      return []
    }
    try {
      const games = await runAurelia<AureliaLibraryGame[]>(['list', '-i'])
      const updates = games
        .filter((game) => game.update_available)
        .map((game) => String(game.app_id))
      if (updates.length) {
        logInfo(
          ['Found', `${updates.length}`, 'Steam games to update'],
          LogPrefix.Steam
        )
      }
      return updates
    } catch (error) {
      logError(
        ['Unable to list updateable Steam games', describeError(error)],
        LogPrefix.Steam
      )
      return []
    }
  }

  async changeGameInstallPath(appName: string, newPath: string): Promise<void> {
    if (!isSteamImportEnabled()) {
      return
    }
    try {
      // `relink` points Steam/Aurelia at an existing install at `newPath`
      // without moving any files.
      await runAurelia(['relink', appName, newPath])
      await this.refresh()
      sendFrontendMessage('refreshLibrary', 'steam')
    } catch (error) {
      logError(
        [`Unable to relink Steam game ${appName}`, describeError(error)],
        LogPrefix.Steam
      )
    }
  }

  changeVersionPinnedStatus(): void {
    logWarning(
      'changeVersionPinnedStatus not implemented on Steam Library Manager',
      LogPrefix.Steam
    )
  }

  installState(appName: string, state: boolean): void {
    if (state) {
      return
    }

    installedGames.delete(appName)

    const stored = installedGamesStore.get('installed', [])
    const filtered = stored.filter((value) => value.appName !== appName)
    if (filtered.length !== stored.length) {
      installedGamesStore.set('installed', filtered)
    }

    const cached = this.getGameInfo(appName)
    if (cached) {
      cached.is_installed = false
      cached.install = {}
      library.set(appName, cached)
      sendFrontendMessage('pushGameToLibrary', cached)
    }
  }

  async markInstalled(appName: string): Promise<void> {
    if (!isSteamImportEnabled()) {
      return
    }

    let installPath: string
    try {
      // `list -i` reports installed games with their full install info
      const games = await runAurelia<AureliaLibraryGame[]>(['list', '-i'])
      const game = games.find((value) => String(value.app_id) === appName)
      if (!game?.is_installed || !game.install_path) {
        return
      }
      installPath = game.install_path
    } catch (error) {
      logWarning(
        [`Unable to mark ${appName} as installed`, describeError(error)],
        LogPrefix.Steam
      )
      return
    }

    const installed: InstalledInfo = {
      executable: '',
      install_path: installPath,
      install_size: getFileSize(0),
      is_dlc: false,
      version: '',
      platform: installPlatform,
      appName
    }
    installedGames.set(appName, installed)
    installedGamesStore.set('installed', Array.from(installedGames.values()))

    const cached = this.getGameInfo(appName)
    if (cached) {
      cached.is_installed = true
      cached.install = installed
      library.set(appName, cached)
      sendFrontendMessage('pushGameToLibrary', cached)
    }
  }

  async getLaunchOptions(appName: string): Promise<LaunchOption[]> {
    if (!isSteamImportEnabled()) {
      return []
    }
    try {
      const response = await runAurelia<AureliaLaunchOptionsResponse>([
        'launch-options',
        appName
      ])
      const currentOs = isWindows ? 'windows' : isMac ? 'macos' : 'linux'
      return (
        (response.launch_options ?? [])
          // Aurelia lists options for every platform
          // only show current OS's.
          .filter(
            (option) =>
              !option.oslist || option.oslist.toLowerCase().includes(currentOs)
          )
          .map((option) => ({
            type: 'basic',
            name:
              option.description || option.executable || `Option ${option.id}`,
            parameters: option.arguments ?? ''
          }))
      )
    } catch (error) {
      logWarning(
        [
          `Unable to get Steam launch options for ${appName}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
      return []
    }
  }
}
