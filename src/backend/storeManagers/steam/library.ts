import { join } from 'path'
import { existsSync, readdirSync, readFileSync } from 'graceful-fs'
import { parse } from '@node-steam/vdf'
import {
  ExecResult,
  GameInfo,
  InstallInfo,
  InstalledInfo,
  LaunchOption
} from 'common/types'
import { LibraryManager } from 'common/types/game_manager'
import {
  getRunnerLogWriter,
  logError,
  logInfo,
  logWarning,
  LogPrefix
} from 'backend/logger'
import { GlobalConfig } from 'backend/config'
import { getFileSize, getSteamLibraries } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { libraryStore, installedGamesStore } from './electronStores'
import {
  ignoredSteamAppIds,
  ignoredSteamAppNamePrefixes,
  steamCdnImageBase,
  steamStoreAppUrl
} from './constants'

const library: Map<string, GameInfo> = new Map()
const installedGames: Map<string, InstalledInfo> = new Map()

const installPlatform = isWindows ? 'windows' : isMac ? 'osx' : 'linux'

interface SteamAppManifest {
  AppState?: {
    appid?: string | number
    name?: string
    installdir?: string
    StateFlags?: string | number
    SizeOnDisk?: string | number
    buildid?: string | number
  }
}

function isSteamImportEnabled(): boolean {
  return !!GlobalConfig.get().getSettings().experimentalFeatures?.steamImport
}

/**
 * Steam library manager.
 *
 * Steam games are discovered from the local Steam installation by reading the
 * `appmanifest_*.acf` files inside each Steam library folder. Every locally
 * found game is, by definition, installed (Steam only writes a manifest for
 * games that are installed or currently downloading).
 */
export default class SteamLibraryManager implements LibraryManager {
  async init(): Promise<void> {
    if (!isSteamImportEnabled()) return
    await this.refresh()
  }

  async refresh(): Promise<ExecResult | null> {
    if (!isSteamImportEnabled()) {
      return { stdout: '', stderr: 'Steam import disabled' }
    }

    logInfo('Refreshing Steam library', LogPrefix.Steam)
    library.clear()
    installedGames.clear()

    let steamLibraries: string[] = []
    try {
      steamLibraries = await getSteamLibraries()
    } catch (error) {
      logError(['Unable to get Steam libraries', error], LogPrefix.Steam)
      return { stdout: '', stderr: 'Unable to get Steam libraries' }
    }

    const uniqueLibraries = Array.from(new Set(steamLibraries))
    for (const libraryPath of uniqueLibraries) {
      const steamappsPath = join(libraryPath, 'steamapps')
      if (!existsSync(steamappsPath)) {
        continue
      }

      let manifests: string[] = []
      try {
        manifests = readdirSync(steamappsPath).filter(
          (file) => file.startsWith('appmanifest_') && file.endsWith('.acf')
        )
      } catch (error) {
        logWarning(
          ['Unable to read Steam library folder', steamappsPath, error],
          LogPrefix.Steam
        )
        continue
      }

      for (const manifest of manifests) {
        const parsed = this.parseManifest(
          libraryPath,
          join(steamappsPath, manifest)
        )
        if (!parsed) {
          continue
        }

        const { info, installed } = parsed
        // A game can only live in one library folder. If we already saw it,
        // skip the duplicate manifest.
        if (library.has(info.app_name)) {
          continue
        }

        if (installed.install_path && existsSync(installed.install_path)) {
          info.is_installed = true
          info.install = installed
          installedGames.set(info.app_name, installed)
        }

        library.set(info.app_name, info)
        sendFrontendMessage('pushGameToLibrary', info)
      }
    }

    libraryStore.set('games', Array.from(library.values()))
    installedGamesStore.set('installed', Array.from(installedGames.values()))

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
    const steamLogWriter = getRunnerLogWriter('steam')
    void steamLogWriter.logInfo(logContent)

    logInfo(`Found ${library.size} Steam games`, LogPrefix.Steam)

    return { stdout: 'Library refreshed', stderr: '' }
  }

  private parseManifest(
    libraryPath: string,
    manifestPath: string
  ): { info: GameInfo; installed: InstalledInfo } | undefined {
    try {
      const data = parse(
        readFileSync(manifestPath, 'utf-8')
      ) as SteamAppManifest
      const appState = data.AppState
      if (!appState?.appid || !appState.name) {
        return
      }

      const appId = String(appState.appid)
      const title = String(appState.name)

      if (ignoredSteamAppIds.includes(appId)) {
        return
      }
      if (
        ignoredSteamAppNamePrefixes.some((prefix) => title.startsWith(prefix))
      ) {
        return
      }

      const installDir = appState.installdir
        ? join(libraryPath, 'steamapps', 'common', String(appState.installdir))
        : ''
      const sizeOnDisk = Number(appState.SizeOnDisk ?? 0)

      const installed: InstalledInfo = {
        executable: '',
        install_path: installDir,
        install_size: getFileSize(sizeOnDisk),
        is_dlc: false,
        version: appState.buildid ? String(appState.buildid) : '',
        platform: installPlatform,
        appName: appId
      }

      return { info: this.steamToUnifiedInfo(appId, title), installed }
    } catch (error) {
      logError(
        ['Unable to parse Steam manifest', manifestPath, error],
        LogPrefix.Steam
      )
      return
    }
  }

  steamToUnifiedInfo(appId: string, title: string): GameInfo {
    return {
      runner: 'steam',
      app_name: appId,
      title,
      art_cover: `${steamCdnImageBase}/${appId}/header.jpg`,
      art_square: `${steamCdnImageBase}/${appId}/library_600x900.jpg`,
      art_background: `${steamCdnImageBase}/${appId}/library_hero.jpg`,
      art_logo: `${steamCdnImageBase}/${appId}/logo.png`,
      store_url: `${steamStoreAppUrl}/${appId}`,
      folder_name: title,
      install: {},
      is_installed: false,
      canRunOffline: true,
      // Steam manages compatibility (Proton) itself, so from Heroic's point of
      // view these games run "natively" on the current platform.
      is_mac_native: isMac,
      is_linux_native: isLinux
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

  async getInstallInfo(): Promise<InstallInfo | undefined> {
    return undefined
  }

  async listUpdateableGames(): Promise<string[]> {
    return []
  }

  async changeGameInstallPath(): Promise<void> {
    return
  }

  changeVersionPinnedStatus(): void {
    logWarning(
      'changeVersionPinnedStatus not implemented on Steam Library Manager',
      LogPrefix.Steam
    )
  }

  installState(): void {
    logWarning(
      'installState not implemented on Steam Library Manager',
      LogPrefix.Steam
    )
  }

  getLaunchOptions(): LaunchOption[] {
    return []
  }
}
