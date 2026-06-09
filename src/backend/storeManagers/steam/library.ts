import { join } from 'path'
import { readFile } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'graceful-fs'
import { parse } from '@node-steam/vdf'
import {
  ExecResult,
  GameInfo,
  InstallInfo,
  InstalledInfo,
  LaunchOption
} from 'common/types'
import { SteamAppInfo, SteamDLCInfo } from 'common/types/steam'
import { LibraryManager } from 'common/types/game_manager'
import { HeroicVDFParser } from './vdf'
import { RandomStream } from './xor'
import { CMsgClientLicenseList } from './steammessages'
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
    BytesDownloaded?: string | number
    BytesToDownload?: string | number
    BytesStaged?: string | number
    BytesToStage?: string | number
    // Map of installed depot id -> depot details. Used to tell which DLC
    // (whose files ship as their own depot) are currently installed.
    InstalledDepots?: Record<string, unknown>
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
 * Reads the list of package ids the user owns from the local, encrypted Steam
 * `licensecache` file. The cache is XOR-encrypted with the account's 64-bit
 * SteamID and, once decrypted, contains a `CMsgClientLicenseList` protobuf
 * message. Works entirely offline.
 */
async function getOwnedPackages(
  steamPath: string,
  userId: string,
  steamId: string
): Promise<{ own: number[]; family: number[] }> {
  const licenseCache = join(
    steamPath,
    'userdata',
    userId,
    'config',
    'licensecache'
  )
  if (!existsSync(licenseCache)) {
    return { own: [], family: [] }
  }
  try {
    const licenseCacheData = await readFile(licenseCache)
    const stream = new RandomStream()
    const data = stream.decrypt_data(BigInt(steamId), licenseCacheData)
    // The last 4 bytes are a trailing checksum, not part of the message.
    const licenses = CMsgClientLicenseList.decode(data.subarray(0, -4))
    // The license cache also lists licenses shared by Steam Family members; each
    // license's `ownerId` is the 32-bit account id of whoever actually owns it.
    const accountId = Number(userId)
    const own: number[] = []
    const family: number[] = []
    for (const license of licenses.licenses) {
      if (license.packageId !== undefined) {
        if (license.ownerId === accountId) {
          own.push(license.packageId)
        } else {
          family.push(license.packageId)
        }
      }
    }
    return { own, family }
  } catch (error) {
    logWarning(['Unable to read Steam license cache', error], LogPrefix.Steam)
    return { own: [], family: [] }
  }
}

/**
 * Parses Steam's binary `appcache/appinfo.vdf` into a map of app id -> app info
 * (which includes the nested `data.appinfo.common` tree with the game's name,
 * type and art). Based on the format documented at
 * https://github.com/SteamDatabase/SteamAppInfo
 */
async function loadAppInfo(
  steamPath: string
): Promise<{ [appid: string]: SteamAppInfo }> {
  const appInfoPath = join(steamPath, 'appcache', 'appinfo.vdf')
  const data = await readFile(appInfoPath)
  let offset = 0

  const magic = data.readUInt32LE(offset)
  offset += 4
  offset += 4 // universe
  const version = magic & 0xff

  if (version < 39 || version > 41) {
    logWarning(['Unknown Steam appinfo.vdf version', version], LogPrefix.Steam)
    return {}
  }

  const table: string[] = []
  if (version >= 41) {
    const stringTableOffset = data.readBigInt64LE(offset)
    offset += 8
    const position = offset
    offset = Number(stringTableOffset)
    const count = data.readUInt32LE(offset)
    offset += 4
    for (let i = 0; i < count; i++) {
      let pos = offset
      while (data.at(pos) !== 0) {
        pos++
      }
      if (pos !== offset) {
        table.push(data.toString('utf-8', offset, pos))
      }
      offset = pos + 1
    }
    offset = position
  }

  const parser = new HeroicVDFParser(table)
  const games: { [appid: string]: SteamAppInfo } = {}
  while (true) {
    const appid = data.readUInt32LE(offset)
    offset += 4
    if (appid === 0) break
    const size = data.readUInt32LE(offset)
    offset += 4
    const end = offset + size
    const infoState = data.readUInt32LE(offset)
    offset += 4
    const updateTime = data.readUInt32LE(offset)
    offset += 4
    const token = data.readBigInt64LE(offset)
    offset += 8
    offset += 20 // sha1 hash
    const changeNumber = data.readUInt32LE(offset)
    offset += 4
    if (version >= 40) {
      offset += 20 // binary vdf hash
    }
    const vdfData = data.subarray(offset, end)
    offset = end
    try {
      const parsedData = parser.parse(vdfData)
      games[appid.toString()] = {
        appid,
        infoState,
        updateTime,
        token,
        changeNumber,
        data: parsedData
      }
    } catch (error) {
      logWarning(
        ['Failed to parse Steam appinfo entry', error],
        LogPrefix.Steam
      )
    }
  }

  return games
}

/**
 * Parses Steam's binary `appcache/packageinfo.vdf` into a map of package id ->
 * package data (which includes the `appids` list of apps in that package).
 */
async function loadPackageInfo(
  steamPath: string
): Promise<{ [packageid: string]: unknown }> {
  const packageInfoPath = join(steamPath, 'appcache', 'packageinfo.vdf')
  const data = await readFile(packageInfoPath)
  let offset = 0
  const magic = data.readUInt32LE(offset)
  offset += 4
  offset += 4 // universe
  const version = magic & 0xff
  if (version < 39 || version > 40) {
    logWarning(
      ['Unknown Steam packageinfo.vdf version', version],
      LogPrefix.Steam
    )
    return {}
  }

  const parser = new HeroicVDFParser([])
  let packages: { [packageid: string]: unknown } = {}
  while (true) {
    const subid = data.readUInt32LE(offset)
    offset += 4
    if (subid === 0xffffffff) break
    offset += 20 // sha1 hash
    offset += 4 // change number
    if (version >= 40) {
      offset += 8 // token
    }
    try {
      const parsedData = parser.parse(data, offset)
      offset = parser.offset
      packages = { ...packages, ...parsedData }
    } catch (error) {
      logWarning(
        ['Failed to parse Steam packageinfo entry', error],
        LogPrefix.Steam
      )
      break
    }
  }
  return packages
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

    // The app ids the user owns a license for, used to tell the user's own
    // games apart from ones only available through a Steam Family member.
    const ownedAppIds = await this.getOwnedAppIds()

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
          join(steamappsPath, manifest),
          ownedAppIds
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

    // Installed games are fully discovered above; the owned-games fetch below
    // only ever adds owned-but-not-installed entries. Persist the installed
    // games now so any failure while reading the optional owned-games sources
    // can never wipe out install info (size/version/path) for installed games.
    installedGamesStore.set('installed', Array.from(installedGames.values()))

    // In addition to the locally installed games found above, fetch the full
    // list of games the user owns on Steam (including ones that are not
    // installed) so they show up in the library as well. This is best-effort:
    // a failure (e.g. parsing the local Steam binary caches) must never abort
    // the refresh or prevent the library/installed stores from being saved.
    try {
      await this.refreshOwnedGames(ownedAppIds)
    } catch (error) {
      logError(['Failed to fetch owned Steam games', error], LogPrefix.Steam)
    }

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
  private async refreshOwnedGames(ownedAppIds: Set<string>): Promise<void> {
    const accounts = SteamUser.getAccounts()
    if (!accounts.length) {
      logInfo(
        'Not logged in to Steam, skipping owned games fetch',
        LogPrefix.Steam
      )
      return
    }

    // Owned games are collected across every logged-in Steam account and merged
    // into a single library view.
    const profileTitles = new Map<string, string>()
    const localAppIds = new Set<string>()
    const licenseTitles = new Map<string, string>()
    const licenseFamilyTitles = new Map<string, string>()

    for (const { steamId } of accounts) {
      // Source 1 (supplement): public community profile. Entries already carry a
      // title, so no extra lookup is needed. Only works for public profiles.
      for (const { appId, title } of await this.fetchOwnedGamesFromProfile(
        steamId
      )) {
        profileTitles.set(appId, title)
      }

      // Source 2 (prioritized): local Steam client data. Works for private
      // profiles too since the data is stored locally on the user's machine.
      // These are just app ids and need their names resolved.
      for (const appId of this.readLocalOwnedAppIds(steamId)) {
        localAppIds.add(appId)
      }

      // Source 3 (prioritized, local): owned games read from the encrypted Steam
      // license cache plus the binary app/package info caches. Works offline and
      // for private profiles, and resolves names locally so most ids need no
      // throttled storefront lookup.
      const { own, family } = await this.readOwnedFromLicenseCache(steamId)
      for (const [appId, title] of own.entries()) {
        licenseTitles.set(appId, title)
      }
      for (const [appId, title] of family.entries()) {
        licenseFamilyTitles.set(appId, title)
      }
    }

    if (localAppIds.size) {
      logInfo(
        `Found ${localAppIds.size} owned games in local Steam data`,
        LogPrefix.Steam
      )
    }
    if (licenseTitles.size || licenseFamilyTitles.size) {
      logInfo(
        `Found ${licenseTitles.size} owned and ${licenseFamilyTitles.size} family-shared games in Steam license cache`,
        LogPrefix.Steam
      )
    }

    const candidateIds = new Set<string>([
      ...profileTitles.keys(),
      ...localAppIds,
      ...licenseTitles.keys(),
      ...licenseFamilyTitles.keys()
    ])

    let added = 0
    const deferred: string[] = []
    for (const appId of candidateIds) {
      // Skip invalid ids (e.g. "0" can show up from the local package caches),
      // already-known installed games, and ignored runtimes/redistributables.
      if (
        !appId ||
        appId === '0' ||
        library.has(appId) ||
        ignoredSteamAppIds.includes(appId)
      ) {
        continue
      }

      const isFamilyShare = ownedAppIds.size > 0 && !ownedAppIds.has(appId)

      // Prefer the title from the public profile; otherwise use a cached name.
      const profileTitle = profileTitles.get(appId)
      if (profileTitle) {
        if (this.addOwnedGame(appId, profileTitle, isFamilyShare)) added++
        continue
      }

      // Next prefer a name resolved locally from the Steam app info cache.
      const licenseTitle =
        licenseTitles.get(appId) || licenseFamilyTitles.get(appId)
      if (licenseTitle) {
        if (this.addOwnedGame(appId, licenseTitle, isFamilyShare)) added++
        continue
      }

      const cached = appNamesStore.get(appId)
      if (cached !== undefined) {
        // An empty string is our sentinel for "known, but not a game".
        if (cached && this.addOwnedGame(appId, cached, isFamilyShare)) added++
        continue
      }

      // Unknown name -> resolve it in the background.
      deferred.push(appId)
    }

    if (added) {
      logInfo(
        `Added ${added} owned/shared (not installed) Steam games`,
        LogPrefix.Steam
      )
    }

    if (!candidateIds.size) {
      logWarning(
        'No Steam games found. Make sure you are logged in and the Steam client is installed (or set your Steam profile game details to public).',
        LogPrefix.Steam
      )
    }

    // Resolve any remaining names in the background; they trickle into the
    // library as they are fetched and are persisted once done.
    if (deferred.length) {
      void this.enrichOwnedGames(deferred, ownedAppIds)
    }
  }

  /**
   * Adds a single owned/shared (not installed) game to the library and pushes it to
   * the frontend. Returns whether the game was actually added (it is skipped if
   * already present or filtered out as an ignored app/name).
   */
  private addOwnedGame(
    appId: string,
    title: string,
    isFamilyShare: boolean
  ): boolean {
    if (library.has(appId) || ignoredSteamAppIds.includes(appId)) {
      return false
    }
    if (
      ignoredSteamAppNamePrefixes.some((prefix) => title.startsWith(prefix))
    ) {
      return false
    }

    const info = this.steamToUnifiedInfo(appId, title)
    if (isFamilyShare) {
      info.isSteamFamilyShare = true
    }
    library.set(appId, info)
    sendFrontendMessage('pushGameToLibrary', info)
    return true
  }

  /**
   * Resolves the names of the given app ids in the background (throttled) and
   * adds the ones that turn out to be games to the library. Persists the
   * library store once finished so the newly added games survive a restart.
   */
  private async enrichOwnedGames(
    appIds: string[],
    ownedAppIds: Set<string>
  ): Promise<void> {
    let added = 0
    for (const appId of appIds) {
      if (library.has(appId)) {
        continue
      }

      const title = await this.resolveAppName(appId)
      if (title) {
        const isFamilyShare = ownedAppIds.size > 0 && !ownedAppIds.has(appId)
        if (this.addOwnedGame(appId, title, isFamilyShare)) {
          added++
        }
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
   * Returns the set of Steam app ids the user owns a license for, read from the
   * local encrypted license cache plus the binary `packageinfo.vdf` (across
   * every logged-in account). Works offline and for private profiles. Used to
   * tell games the user owns apart from ones only available through a Steam
   * Family member's library. Returns an empty set if ownership can't be
   * determined (so callers can avoid mislabeling games as family-shared).
   */
  private async getOwnedAppIds(): Promise<Set<string>> {
    const owned = new Set<string>()

    const accounts = SteamUser.getAccounts()
    if (!accounts.length) {
      return owned
    }

    const { defaultSteamPath } = GlobalConfig.get().getSettings()
    const steamRoot = defaultSteamPath.replaceAll("'", '')

    let packageInfo: { [packageid: string]: unknown } = {}
    try {
      packageInfo = await loadPackageInfo(steamRoot)
    } catch (error) {
      logWarning(
        ['Unable to read Steam package info cache', error],
        LogPrefix.Steam
      )
      return owned
    }

    for (const { steamId } of accounts) {
      let accountId: string
      try {
        accountId = (BigInt(steamId) & BigInt(0xffffffff)).toString()
      } catch {
        continue
      }

      let packages: { own: number[]; family: number[] }
      try {
        packages = await getOwnedPackages(steamRoot, accountId, steamId)
      } catch {
        continue
      }

      for (const packageId of packages.own) {
        const packageData = packageInfo[packageId.toString()]
        if (
          typeof packageData === 'object' &&
          packageData !== null &&
          'appids' in packageData &&
          typeof (packageData as { appids: unknown }).appids === 'object' &&
          (packageData as { appids: unknown }).appids !== null
        ) {
          const ids = (packageData as { appids: Record<string, unknown> })
            .appids
          for (const appId of Object.values(ids)) {
            owned.add(String(appId))
          }
        }
      }
    }

    return owned
  }

  /**
   * Reads the games the user owns directly from the local Steam client data:
   * decrypts the license cache to get owned package ids, maps them to app ids
   * via the binary `packageinfo.vdf`, then resolves their names/types via the
   * binary `appinfo.vdf`. Works offline and for private profiles, and yields
   * names locally so most ids need no throttled storefront lookup. Returns a
   * map of app id -> title for entries that are actually games.
   */
  private async readOwnedFromLicenseCache(
    steamId: string
  ): Promise<{ own: Map<string, string>; family: Map<string, string> }> {
    const ownResult = new Map<string, string>()
    const familyResult = new Map<string, string>()

    const { defaultSteamPath } = GlobalConfig.get().getSettings()
    const steamRoot = defaultSteamPath.replaceAll("'", '')

    let accountId: string
    try {
      // The license cache is stored under the 32-bit account id folder.
      accountId = (BigInt(steamId) & BigInt(0xffffffff)).toString()
    } catch {
      return { own: ownResult, family: familyResult }
    }

    let packages: { own: number[]; family: number[] }
    try {
      packages = await getOwnedPackages(steamRoot, accountId, steamId)
    } catch (error) {
      logWarning(
        ['Unable to read Steam owned packages', error],
        LogPrefix.Steam
      )
      return { own: ownResult, family: familyResult }
    }
    if (!packages.own.length && !packages.family.length) {
      return { own: ownResult, family: familyResult }
    }

    let appInfo: { [appid: string]: SteamAppInfo } = {}
    let packageInfo: { [packageid: string]: unknown } = {}
    try {
      ;[appInfo, packageInfo] = await Promise.all([
        loadAppInfo(steamRoot),
        loadPackageInfo(steamRoot)
      ])
    } catch (error) {
      logWarning(
        ['Unable to read Steam app/package info caches', error],
        LogPrefix.Steam
      )
      return { own: ownResult, family: familyResult }
    }

    const mapIds = (pkgList: number[], outputMap: Map<string, string>) => {
      const appIds = new Set<string>()
      for (const packageId of pkgList) {
        const packageData = packageInfo[packageId.toString()]
        if (
          typeof packageData === 'object' &&
          packageData !== null &&
          'appids' in packageData &&
          typeof (packageData as { appids: unknown }).appids === 'object' &&
          (packageData as { appids: unknown }).appids !== null
        ) {
          const ids = (packageData as { appids: Record<string, unknown> })
            .appids
          for (const appId of Object.values(ids)) {
            appIds.add(String(appId))
          }
        }
      }

      for (const appId of appIds) {
        const common = this.getAppInfoCommon(appInfo[appId])
        if (!common || common.type.toLowerCase() !== 'game') {
          continue
        }
        outputMap.set(appId, common.name)
      }
    }

    mapIds(packages.own, ownResult)
    mapIds(packages.family, familyResult)

    return { own: ownResult, family: familyResult }
  }

  /**
   * Safely extracts the `data.appinfo.common.{name,type}` fields from a parsed
   * `appinfo.vdf` entry, returning undefined when the structure does not match.
   */
  private getAppInfoCommon(
    app: SteamAppInfo | undefined
  ): { name: string; type: string } | undefined {
    if (!app || typeof app.data !== 'object' || app.data === null) {
      return
    }
    const appinfo = (app.data as Record<string, unknown>).appinfo
    if (typeof appinfo !== 'object' || appinfo === null) {
      return
    }
    const common = (appinfo as Record<string, unknown>).common
    if (typeof common !== 'object' || common === null) {
      return
    }
    const record = common as Record<string, unknown>
    if (typeof record.name !== 'string' || typeof record.type !== 'string') {
      return
    }
    return { name: record.name, type: record.type }
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
    manifestPath: string,
    ownedAppIds?: Set<string>
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

      const info = this.steamToUnifiedInfo(appId, title)

      // The game is only shown via Steam Family sharing if the user doesn't own
      // a license for it themselves (who installed it - the `LastOwner` - is
      // irrelevant; a family member may have installed a game the user also
      // owns). `ownedAppIds` being empty means ownership couldn't be determined,
      // so don't flag anything in that case.
      if (ownedAppIds && ownedAppIds.size > 0 && !ownedAppIds.has(appId)) {
        info.isSteamFamilyShare = true
      }

      return { info, installed }
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
  async findInstalledGame(appId: string): Promise<
    | {
        installed: InstalledInfo
        fullyInstalled: boolean
        bytesDownloaded: number
        bytesToDownload: number
        bytesStaged: number
        bytesToStage: number
        sizeOnDisk: number
      }
    | undefined
  > {
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
      let bytesDownloaded = 0
      let bytesToDownload = 0
      let bytesStaged = 0
      let bytesToStage = 0
      let sizeOnDisk = 0
      try {
        const data = parse(
          readFileSync(manifestPath, 'utf-8')
        ) as SteamAppManifest
        flags = Number(data.AppState?.StateFlags ?? 0)
        bytesDownloaded = Number(data.AppState?.BytesDownloaded ?? 0)
        bytesToDownload = Number(data.AppState?.BytesToDownload ?? 0)
        bytesStaged = Number(data.AppState?.BytesStaged ?? 0)
        bytesToStage = Number(data.AppState?.BytesToStage ?? 0)
        sizeOnDisk = Number(data.AppState?.SizeOnDisk ?? 0)
        if (!Number.isFinite(bytesDownloaded)) bytesDownloaded = 0
        if (!Number.isFinite(bytesToDownload)) bytesToDownload = 0
        if (!Number.isFinite(bytesStaged)) bytesStaged = 0
        if (!Number.isFinite(bytesToStage)) bytesToStage = 0
        if (!Number.isFinite(sizeOnDisk)) sizeOnDisk = 0
      } catch {
        // Treat an unreadable manifest as "not fully installed yet".
      }

      const fullyInstalled =
        (flags & steamStateFullyInstalled) !== 0 &&
        (flags & steamStateInProgressMask) === 0 &&
        !!parsed.installed.install_path &&
        existsSync(parsed.installed.install_path)

      return {
        installed: parsed.installed,
        fullyInstalled,
        bytesDownloaded,
        bytesToDownload,
        bytesStaged,
        bytesToStage,
        sizeOnDisk
      }
    }

    return
  }

  /**
   * Lists a Steam game's DLC with whether the user owns each one and whether its
   * files are installed.
   *
   * Ownership comes from the local license cache; the DLC list and their depots
   * come from `appinfo.vdf`. A DLC's depots can be declared two ways: on the
   * parent game's depots via a `dlcappid` back-reference, or (when the parent
   * sets `hasdepotsindlc`) inside the DLC's own appinfo entry. A DLC is
   * installed when any of its depots appears in the base game's `appmanifest`
   * `InstalledDepots`. License-only DLC (no depot) counts as installed once
   * owned, since there is nothing separate to download.
   */
  async getDLCInfo(appId: string): Promise<SteamDLCInfo[]> {
    if (!isSteamImportEnabled()) {
      return []
    }

    const { defaultSteamPath } = GlobalConfig.get().getSettings()
    const steamRoot = defaultSteamPath.replaceAll("'", '')

    let appInfo: { [appid: string]: SteamAppInfo } = {}
    try {
      appInfo = await loadAppInfo(steamRoot)
    } catch (error) {
      logWarning(
        ['Unable to read Steam app info cache for DLC', error],
        LogPrefix.Steam
      )
      return []
    }

    const parentAppInfo = this.getAppInfoData(appInfo[appId])
    if (!parentAppInfo) {
      return []
    }

    // All DLC app ids the game declares.
    const listOfDlc = this.getListOfDlc(parentAppInfo)
    if (!listOfDlc.length) {
      return []
    }

    // We can only meaningfully report ownership when the license cache could be
    // read; an empty set means we couldn't determine it, so don't guess.
    const ownedAppIds = await this.getOwnedAppIds()
    if (ownedAppIds.size === 0) {
      return []
    }

    // depot id -> owning DLC app id, for DLC whose depots are declared on the
    // parent game (the other pattern - depots declared in the DLC's own appinfo
    // entry - is read per-DLC below).
    const parentDlcDepots = this.getDlcDepots(parentAppInfo)
    // Depots currently installed for the base game.
    const installedDepots = await this.getInstalledDepots(appId)

    const dlcs: SteamDLCInfo[] = listOfDlc.map((dlcId) => {
      const title =
        this.getAppInfoCommon(appInfo[dlcId])?.name ||
        appNamesStore.get(dlcId) ||
        `DLC ${dlcId}`

      const owned = ownedAppIds.has(dlcId)

      // Gather this DLC's depots from both declaration styles.
      const depots = new Set<string>()
      for (const [depotId, owner] of Object.entries(parentDlcDepots)) {
        if (owner === dlcId) depots.add(depotId)
      }
      for (const depotId of this.getOwnDepots(appInfo[dlcId])) {
        depots.add(depotId)
      }

      // Unowned DLC is never installed. Owned DLC with depots is installed when
      // any of them is present; owned license-only DLC (no depots) is installed.
      const installed =
        owned &&
        (depots.size === 0
          ? true
          : [...depots].some((depot) => installedDepots.has(depot)))

      return { appId: dlcId, title, owned, installed }
    })

    // Installed first, then owned-but-not-installed, then not owned; alphabetical
    // within each group.
    const rank = (dlc: SteamDLCInfo) => (dlc.installed ? 0 : dlc.owned ? 1 : 2)
    dlcs.sort((a, b) => rank(a) - rank(b) || (a.title < b.title ? -1 : 1))
    return dlcs
  }

  /** Safely returns the `data.appinfo` object from a parsed appinfo entry. */
  private getAppInfoData(
    app: SteamAppInfo | undefined
  ): Record<string, unknown> | undefined {
    if (!app || typeof app.data !== 'object' || app.data === null) {
      return
    }
    const appinfo = (app.data as Record<string, unknown>).appinfo
    if (typeof appinfo !== 'object' || appinfo === null) {
      return
    }
    return appinfo as Record<string, unknown>
  }

  /** Reads `extended.listofdlc` (a comma-separated list of DLC app ids). */
  private getListOfDlc(appinfo: Record<string, unknown>): string[] {
    const extended = appinfo.extended
    if (typeof extended !== 'object' || extended === null) {
      return []
    }
    const raw = (extended as Record<string, unknown>).listofdlc
    if (typeof raw !== 'string' && typeof raw !== 'number') {
      return []
    }
    return String(raw)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  }

  /** Maps each DLC depot id to the DLC app id it belongs to (via `dlcappid`). */
  private getDlcDepots(
    appinfo: Record<string, unknown>
  ): Record<string, string> {
    const result: Record<string, string> = {}
    const depots = appinfo.depots
    if (typeof depots !== 'object' || depots === null) {
      return result
    }
    for (const [depotId, value] of Object.entries(
      depots as Record<string, unknown>
    )) {
      if (typeof value !== 'object' || value === null) {
        continue
      }
      const dlcappid = (value as Record<string, unknown>).dlcappid
      if (typeof dlcappid !== 'string' && typeof dlcappid !== 'number') {
        continue
      }
      result[depotId] = String(dlcappid)
    }
    return result
  }

  /**
   * Reads the depot ids declared directly inside a DLC's own appinfo entry
   * (used when the parent game sets `hasdepotsindlc`). Depot ids are the numeric
   * keys of the DLC's `depots` section.
   */
  private getOwnDepots(app: SteamAppInfo | undefined): string[] {
    const appinfo = this.getAppInfoData(app)
    if (!appinfo) {
      return []
    }
    const depots = appinfo.depots
    if (typeof depots !== 'object' || depots === null) {
      return []
    }
    return Object.keys(depots as Record<string, unknown>).filter((key) =>
      /^\d+$/.test(key)
    )
  }

  /** Reads the set of installed depot ids from a game's `appmanifest`. */
  private async getInstalledDepots(appId: string): Promise<Set<string>> {
    const installed = new Set<string>()
    let steamLibraries: string[] = []
    try {
      steamLibraries = await getSteamLibraries()
    } catch {
      return installed
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
      try {
        const data = parse(
          readFileSync(manifestPath, 'utf-8')
        ) as SteamAppManifest
        const depots = data.AppState?.InstalledDepots
        if (depots && typeof depots === 'object') {
          for (const depotId of Object.keys(depots)) {
            installed.add(depotId)
          }
        }
      } catch {
        // Treat an unreadable manifest as "nothing installed".
      }
      break
    }
    return installed
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

  installState(appName: string, state: boolean): void {
    if (state) {
      // Steam manages installs itself; the on-disk `appmanifest` is the source
      // of truth and is picked up by `refresh`, so there is nothing to mark
      // here when a game becomes installed.
      return
    }

    // Mark the game as uninstalled in both the in-memory cache and the
    // persisted store so Heroic stops showing it as installed.
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

  getLaunchOptions(): LaunchOption[] {
    return []
  }
}
