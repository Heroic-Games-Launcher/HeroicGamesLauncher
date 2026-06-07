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
import { getFileSize, getSteamLibraries, axiosClient } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import {
  libraryStore,
  installedGamesStore,
  appNamesStore
} from './electronStores'
import { SteamUser } from './user'
import {
  ignoredSteamAppIds,
  ignoredSteamAppNamePrefixes,
  steamCdnImageBase,
  steamStoreAppUrl,
  profileApiUrl,
  steamAppDetailsApiUrl,
  steamId64Offset,
  steamStateFullyInstalled,
  steamStateInProgressMask
} from './constants'

const library: Map<string, GameInfo> = new Map()
const installedGames: Map<string, InstalledInfo> = new Map()

const installPlatform = isWindows ? 'windows' : isMac ? 'osx' : 'linux'

// Minimum delay between Steam storefront app-name lookups, to stay within the
// public storefront API's rate limits when resolving many ids on first run.
const APPDETAILS_THROTTLE_MS = 1500
let lastAppDetailsFetchTs = 0

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean
    data?: { name?: string; type?: string }
  }
}

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

/**
 * Walks a parsed VDF object following the given key path, matching keys
 * case-insensitively (Steam has historically varied the casing of keys like
 * `Software`/`Valve`). Returns the object at the end of the path, or undefined.
 */
function getNestedCaseInsensitive(
  obj: unknown,
  path: string[]
): Record<string, unknown> | undefined {
  let current: unknown = obj
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    const record = current as Record<string, unknown>
    const matchKey = Object.keys(record).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    )
    if (matchKey === undefined) {
      return undefined
    }
    current = record[matchKey]
  }
  return current && typeof current === 'object'
    ? (current as Record<string, unknown>)
    : undefined
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

    // In addition to the locally installed games found above, fetch the full
    // list of games the user owns on Steam (including ones that are not
    // installed) so they show up in the library as well.
    await this.refreshOwnedGames()

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

  /**
   * Fetches the user's full owned Steam library and adds any games that aren't
   * already present (i.e. owned but not installed locally) to the library.
   *
   * Games whose names are already known (from the public profile or the
   * persistent name cache) are added immediately; the remaining ids are
   * resolved in the background via {@link enrichOwnedGames} so the library
   * shows up quickly instead of blocking on a long sequence of lookups.
   */
  private async refreshOwnedGames(): Promise<void> {
    if (!(await SteamUser.isLoggedIn())) {
      logInfo(
        'Not logged in to Steam, skipping owned games fetch',
        LogPrefix.Steam
      )
      return
    }

    const credentials = await SteamUser.getCredentials()
    if (!credentials?.steamId) {
      return
    }

    // Source 1 (supplement): public community profile. Entries already carry a
    // title, so no extra lookup is needed. Only works for public profiles.
    const profileTitles = new Map<string, string>()
    for (const { appId, title } of await this.fetchOwnedGamesFromProfile(
      credentials.steamId
    )) {
      profileTitles.set(appId, title)
    }

    // Source 2 (prioritized): local Steam client data. Works for private
    // profiles too since the data is stored locally on the user's machine.
    // These are just app ids and need their names resolved.
    const localAppIds = this.readLocalOwnedAppIds(credentials.steamId)
    if (localAppIds.length) {
      logInfo(
        `Found ${localAppIds.length} owned games in local Steam data`,
        LogPrefix.Steam
      )
    }

    const candidateIds = new Set<string>([
      ...profileTitles.keys(),
      ...localAppIds
    ])

    let added = 0
    const deferred: string[] = []
    for (const appId of candidateIds) {
      // Already discovered as an installed game during the local scan.
      if (library.has(appId) || ignoredSteamAppIds.includes(appId)) {
        continue
      }

      // Prefer the title from the public profile; otherwise use a cached name.
      const profileTitle = profileTitles.get(appId)
      if (profileTitle) {
        if (this.addOwnedGame(appId, profileTitle)) added++
        continue
      }

      const cached = appNamesStore.get(appId)
      if (cached !== undefined) {
        // An empty string is our sentinel for "known, but not a game".
        if (cached && this.addOwnedGame(appId, cached)) added++
        continue
      }

      // Unknown name -> resolve it in the background.
      deferred.push(appId)
    }

    if (added) {
      logInfo(
        `Added ${added} owned (not installed) Steam games`,
        LogPrefix.Steam
      )
    }

    if (!candidateIds.size) {
      logWarning(
        'No owned Steam games found. Make sure you are logged in and the Steam client is installed (or set your Steam profile game details to public).',
        LogPrefix.Steam
      )
    }

    // Resolve any remaining names in the background; they trickle into the
    // library as they are fetched and are persisted once done.
    if (deferred.length) {
      void this.enrichOwnedGames(deferred)
    }
  }

  /**
   * Adds a single owned (not installed) game to the library and pushes it to
   * the frontend. Returns whether the game was actually added (it is skipped if
   * already present or filtered out as an ignored app/name).
   */
  private addOwnedGame(appId: string, title: string): boolean {
    if (library.has(appId) || ignoredSteamAppIds.includes(appId)) {
      return false
    }
    if (
      ignoredSteamAppNamePrefixes.some((prefix) => title.startsWith(prefix))
    ) {
      return false
    }

    const info = this.steamToUnifiedInfo(appId, title)
    library.set(appId, info)
    sendFrontendMessage('pushGameToLibrary', info)
    return true
  }

  /**
   * Resolves the names of the given app ids in the background (throttled) and
   * adds the ones that turn out to be games to the library. Persists the
   * library store once finished so the newly added games survive a restart.
   */
  private async enrichOwnedGames(appIds: string[]): Promise<void> {
    let added = 0
    for (const appId of appIds) {
      if (library.has(appId)) {
        continue
      }

      const title = await this.resolveAppName(appId)
      if (title && this.addOwnedGame(appId, title)) {
        added++
      }
    }

    if (added) {
      libraryStore.set('games', Array.from(library.values()))
      logInfo(
        `Added ${added} owned Steam games after resolving their names`,
        LogPrefix.Steam
      )
    }
  }

  /**
   * Fetches owned games from the user's public community profile games list
   * (XML). Requires the profile's game details to be public on Steam.
   */
  private async fetchOwnedGamesFromProfile(
    steamId: string
  ): Promise<{ appId: string; title: string }[]> {
    try {
      const url = `${profileApiUrl}/${steamId}/games?tab=all&xml=1`
      const { data } = await axiosClient.get<string>(url)

      const games: { appId: string; title: string }[] = []
      const gameBlocks = data.match(/<game>[\s\S]*?<\/game>/g) ?? []
      for (const block of gameBlocks) {
        const appId = block.match(/<appID>(\d+)<\/appID>/)?.[1]
        const title =
          block.match(/<name><!\[CDATA\[([\s\S]*?)\]\]><\/name>/)?.[1] ??
          block.match(/<name>([\s\S]*?)<\/name>/)?.[1]
        if (appId && title) {
          games.push({ appId, title: title.trim() })
        }
      }

      return games
    } catch (error) {
      logError(
        ['Unable to fetch owned Steam games from profile', error],
        LogPrefix.Steam
      )
      return []
    }
  }

  /**
   * Reads the app ids the user owns/has played from the local Steam client
   * data. This works regardless of the Steam profile privacy setting because
   * the data is stored locally on the user's machine.
   */
  private readLocalOwnedAppIds(steamId: string): string[] {
    const { defaultSteamPath } = GlobalConfig.get().getSettings()
    const steamRoot = defaultSteamPath.replaceAll("'", '')
    const userdataPath = join(steamRoot, 'userdata')

    if (!existsSync(userdataPath)) {
      logInfo(
        `Steam userdata folder not found at ${userdataPath}, cannot read local owned games`,
        LogPrefix.Steam
      )
      return []
    }

    // Prefer the folder matching the logged-in account; fall back to scanning
    // every account folder if it can't be determined.
    let accountDirs: string[] = []
    try {
      const accountId = (BigInt(steamId) - steamId64Offset).toString()
      if (existsSync(join(userdataPath, accountId))) {
        accountDirs = [accountId]
      }
    } catch {
      // Ignore malformed steam ids and fall through to scanning all folders.
    }

    if (!accountDirs.length) {
      try {
        accountDirs = readdirSync(userdataPath).filter(
          (dir) => /^\d+$/.test(dir) && dir !== '0'
        )
      } catch (error) {
        logWarning(
          ['Unable to read Steam userdata folder', error],
          LogPrefix.Steam
        )
        return []
      }
    }

    const appIds = new Set<string>()
    for (const accountDir of accountDirs) {
      const localConfigPath = join(
        userdataPath,
        accountDir,
        'config',
        'localconfig.vdf'
      )
      if (!existsSync(localConfigPath)) {
        continue
      }

      try {
        const parsed: unknown = parse(readFileSync(localConfigPath, 'utf-8'))
        const apps = getNestedCaseInsensitive(parsed, [
          'UserLocalConfigStore',
          'Software',
          'Valve',
          'Steam',
          'apps'
        ])
        if (apps && typeof apps === 'object') {
          for (const appId of Object.keys(apps)) {
            if (/^\d+$/.test(appId)) {
              appIds.add(appId)
            }
          }
        }
      } catch (error) {
        logWarning(
          ['Unable to parse Steam localconfig.vdf', localConfigPath, error],
          LogPrefix.Steam
        )
      }
    }

    return Array.from(appIds)
  }

  /**
   * Resolves a single Steam app id to its game name using the public storefront
   * `appdetails` API, backed by a persistent cache. The previously used
   * `GetAppList` Web API endpoint was removed by Valve and now returns HTTP 404,
   * so ids are looked up individually instead (cached for a week).
   *
   * Results are cached so they are only fetched once. Ids that turn out not to
   * be games (DLC, soundtracks, tools, ...) or that have no store data are
   * negatively cached as an empty string and excluded from the library.
   */
  private async resolveAppName(appId: string): Promise<string | undefined> {
    const cached = appNamesStore.get(appId)
    if (cached !== undefined) {
      return cached || undefined
    }

    // Throttle network lookups to stay within Steam's storefront rate limits.
    const sinceLastFetch = Date.now() - lastAppDetailsFetchTs
    if (sinceLastFetch < APPDETAILS_THROTTLE_MS) {
      await delay(APPDETAILS_THROTTLE_MS - sinceLastFetch)
    }
    lastAppDetailsFetchTs = Date.now()

    try {
      const { data } = await axiosClient.get<SteamAppDetailsResponse>(
        `${steamAppDetailsApiUrl}?appids=${appId}&filters=basic&l=english`
      )

      const entry = data?.[appId]
      if (entry?.success && entry.data?.type === 'game' && entry.data.name) {
        appNamesStore.set(appId, entry.data.name)
        return entry.data.name
      }

      // Known, but not a game we want to list. Negatively cache it.
      appNamesStore.set(appId, '')
      return undefined
    } catch (error) {
      logWarning(
        ['Unable to resolve Steam app name', appId, error],
        LogPrefix.Steam
      )
      return undefined
    }
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

  /**
   * Looks for an `appmanifest_<appId>.acf` across all Steam library folders and
   * reports whether the game is installed locally and, if so, whether Steam has
   * finished downloading it (as opposed to an install/update still running).
   */
  async findInstalledGame(
    appId: string
  ): Promise<{ installed: InstalledInfo; fullyInstalled: boolean } | undefined> {
    let steamLibraries: string[] = []
    try {
      steamLibraries = await getSteamLibraries()
    } catch (error) {
      logError(['Unable to get Steam libraries', error], LogPrefix.Steam)
      return
    }

    for (const libraryPath of new Set(steamLibraries)) {
      const manifestPath = join(
        libraryPath,
        'steamapps',
        `appmanifest_${appId}.acf`
      )
      if (!existsSync(manifestPath)) {
        continue
      }

      const parsed = this.parseManifest(libraryPath, manifestPath)
      if (!parsed) {
        continue
      }

      let flags = 0
      try {
        const data = parse(
          readFileSync(manifestPath, 'utf-8')
        ) as SteamAppManifest
        flags = Number(data.AppState?.StateFlags ?? 0)
      } catch {
        // Treat an unreadable manifest as "not fully installed yet".
      }

      const fullyInstalled =
        (flags & steamStateFullyInstalled) !== 0 &&
        (flags & steamStateInProgressMask) === 0 &&
        !!parsed.installed.install_path &&
        existsSync(parsed.installed.install_path)

      return { installed: parsed.installed, fullyInstalled }
    }

    return
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
