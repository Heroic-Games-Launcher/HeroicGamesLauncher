import AdmZip from 'adm-zip'
import { existsSync } from 'graceful-fs'

import { logWarning, LogPrefix } from 'backend/logger'
import type { Runner, WineVersionInfo } from 'common/types'
import type {
  CredentialPresence,
  CredentialValidation,
  HeroicBackupManifest,
  HeroicBackupValidationReport,
  InstalledGameSummary,
  PerGamePathIssue,
  WineVersionIssue
} from 'common/types/importExport'
import { wineDownloaderInfoStore } from 'backend/wine/manager/utils'

import { BACKUP_FORMAT_VERSION, BACKUP_PATHS } from './constants'

const PER_GAME_DIR = BACKUP_PATHS.perGameSettings.dir

function safeJsonParse<T>(data: Buffer | undefined | null): T | null {
  if (!data) return null
  try {
    return JSON.parse(data.toString('utf-8')) as T
  } catch {
    return null
  }
}

function getManifest(zip: AdmZip): HeroicBackupManifest | null {
  const entry = zip.getEntry(BACKUP_PATHS.manifest)
  if (!entry) return null
  return safeJsonParse<HeroicBackupManifest>(entry.getData())
}

function isHeroicBackupManifest(v: unknown): v is HeroicBackupManifest {
  if (!v || typeof v !== 'object') return false
  const rec = v as Record<string, unknown>
  return (
    typeof rec.formatVersion === 'number' &&
    typeof rec.heroicVersion === 'string' &&
    typeof rec.createdAt === 'string' &&
    typeof rec.platform === 'string' &&
    Array.isArray(rec.stages)
  )
}

interface ZipGameInfo {
  app_name: string
  title?: string
  install?: { install_path?: string; platform?: string }
}

function readLibraryEntry(
  zip: AdmZip,
  entryPath: string,
  key: 'library' | 'games'
): ZipGameInfo[] {
  const entry = zip.getEntry(entryPath)
  if (!entry) return []
  const data = safeJsonParse<Record<string, unknown>>(entry.getData())
  const list = data?.[key]
  return Array.isArray(list) ? (list as ZipGameInfo[]) : []
}

function buildGameTitleMap(
  zip: AdmZip
): Record<string, { title: string; runner: Runner }> {
  const out: Record<string, { title: string; runner: Runner }> = {}
  const push = (games: ZipGameInfo[], runner: Runner) => {
    for (const g of games) {
      if (!g || typeof g.app_name !== 'string') continue
      if (!out[g.app_name]) {
        out[g.app_name] = { title: g.title ?? g.app_name, runner }
      }
    }
  }
  push(
    readLibraryEntry(
      zip,
      BACKUP_PATHS.libraryCache.legendaryLibrary,
      'library'
    ),
    'legendary'
  )
  push(
    readLibraryEntry(zip, BACKUP_PATHS.libraryCache.gogLibrary, 'games'),
    'gog'
  )
  push(
    readLibraryEntry(zip, BACKUP_PATHS.libraryCache.nileLibrary, 'library'),
    'nile'
  )
  push(
    readLibraryEntry(zip, BACKUP_PATHS.libraryCache.zoomLibrary, 'games'),
    'zoom'
  )
  const sideload = zip.getEntry(BACKUP_PATHS.sideloadLibrary.library)
  if (sideload) {
    const data = safeJsonParse<{ games?: ZipGameInfo[] }>(sideload.getData())
    if (Array.isArray(data?.games)) push(data.games, 'sideload')
  }
  return out
}

interface InstallInfo {
  runner: Runner
  installPath: string
}

function buildInstallMap(zip: AdmZip): Record<string, InstallInfo> {
  const out: Record<string, InstallInfo> = {}

  const legInstalled = safeJsonParse<
    Record<string, { install_path?: string }>
  >(zip.getEntry(BACKUP_PATHS.libraryCache.legendaryInstalled)?.getData())
  if (legInstalled) {
    for (const [appName, info] of Object.entries(legInstalled)) {
      if (info?.install_path) {
        out[appName] = { runner: 'legendary', installPath: info.install_path }
      }
    }
  }

  const thirdParty = safeJsonParse<Record<string, { install_path?: string }>>(
    zip.getEntry(BACKUP_PATHS.libraryCache.legendaryThirdParty)?.getData()
  )
  if (thirdParty) {
    for (const [appName, info] of Object.entries(thirdParty)) {
      if (info?.install_path) {
        out[appName] = { runner: 'legendary', installPath: info.install_path }
      }
    }
  }

  const gogInstalled = safeJsonParse<{
    installed?: Array<{ appName?: string; install_path?: string }>
  }>(zip.getEntry(BACKUP_PATHS.libraryCache.gogInstalled)?.getData())
  if (gogInstalled?.installed) {
    for (const g of gogInstalled.installed) {
      if (g?.appName && g.install_path) {
        out[g.appName] = { runner: 'gog', installPath: g.install_path }
      }
    }
  }

  const nileInstalled = safeJsonParse<Array<{ id?: string; path?: string }>>(
    zip.getEntry(BACKUP_PATHS.libraryCache.nileInstalled)?.getData()
  )
  if (Array.isArray(nileInstalled)) {
    for (const g of nileInstalled) {
      if (g?.id && g.path) {
        out[g.id] = { runner: 'nile', installPath: g.path }
      }
    }
  }

  const sideload = safeJsonParse<{
    games?: Array<{ app_name?: string; install?: { install_path?: string } }>
  }>(zip.getEntry(BACKUP_PATHS.sideloadLibrary.library)?.getData())
  if (sideload?.games) {
    for (const g of sideload.games) {
      if (g?.app_name && g.install?.install_path) {
        out[g.app_name] = {
          runner: 'sideload',
          installPath: g.install.install_path
        }
      }
    }
  }

  return out
}

function readPerGamePrefix(
  zip: AdmZip,
  appName: string
): string | undefined {
  const entry = zip.getEntry(`${PER_GAME_DIR}${appName}.json`)
  if (!entry) return undefined
  const parsed = safeJsonParse<Record<string, unknown>>(entry.getData())
  if (!parsed) return undefined
  const gameBlock = parsed[appName]
  if (!gameBlock || typeof gameBlock !== 'object') return undefined
  const prefix = (gameBlock as Record<string, unknown>)['winePrefix']
  return typeof prefix === 'string' ? prefix : undefined
}

function listPerGameAppNames(zip: AdmZip): string[] {
  const names: string[] = []
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(PER_GAME_DIR)) continue
    if (entry.isDirectory) continue
    const file = entry.entryName.slice(PER_GAME_DIR.length)
    if (!file.endsWith('.json')) continue
    names.push(file.slice(0, -'.json'.length))
  }
  return names
}

function buildCredentialsReport(
  manifest: HeroicBackupManifest,
  zip: AdmZip
): CredentialValidation[] {
  const present = manifest.counts.credentials ?? {
    legendary: false,
    gog: false,
    nile: false,
    zoom: false
  }
  const entries: Array<{ runner: Runner; key: keyof CredentialPresence; path: string }> = [
    { runner: 'legendary', key: 'legendary', path: BACKUP_PATHS.credentials.legendaryUser },
    { runner: 'nile', key: 'nile', path: BACKUP_PATHS.credentials.nileUser },
    { runner: 'gog', key: 'gog', path: BACKUP_PATHS.credentials.gogConfig },
    { runner: 'zoom', key: 'zoom', path: BACKUP_PATHS.credentials.zoomConfig }
  ]
  return entries.map(({ runner, key, path }) => {
    const inZip = !!zip.getEntry(path)
    const declared = !!present[key]
    return {
      runner,
      present: inZip || declared,
      status: inZip ? 'valid' : 'missing',
      displayName: credentialDisplayName(zip, path, runner)
    }
  })
}

function credentialDisplayName(
  zip: AdmZip,
  path: string,
  runner: Runner
): string | undefined {
  const entry = zip.getEntry(path)
  if (!entry) return undefined
  const data = safeJsonParse<Record<string, unknown>>(entry.getData())
  if (!data) return undefined
  if (runner === 'legendary') {
    const displayName = data['displayName']
    return typeof displayName === 'string' ? displayName : undefined
  }
  if (runner === 'nile') {
    const ext = data['extensions'] as Record<string, unknown> | undefined
    const customer = ext?.['customer_info'] as Record<string, unknown> | undefined
    const name = customer?.['name']
    return typeof name === 'string' ? name : undefined
  }
  if (runner === 'gog') {
    const userData = data['userData'] as Record<string, unknown> | undefined
    const name = userData?.['username']
    return typeof name === 'string' ? name : undefined
  }
  if (runner === 'zoom') {
    const username = data['username']
    return typeof username === 'string' ? username : undefined
  }
  return undefined
}

function buildInstalledOK(
  installMap: Record<string, InstallInfo>,
  titleMap: Record<string, { title: string; runner: Runner }>
): InstalledGameSummary[] {
  const out: InstalledGameSummary[] = []
  for (const [appName, install] of Object.entries(installMap)) {
    if (!install?.installPath) continue
    if (!existsSync(install.installPath)) continue
    out.push({
      appName,
      installPath: install.installPath,
      runner: titleMap[appName]?.runner ?? install.runner,
      title: titleMap[appName]?.title ?? appName
    })
  }
  out.sort((a, b) => a.title.localeCompare(b.title))
  return out
}

function buildPathIssues(
  zip: AdmZip,
  appNames: string[],
  installMap: Record<string, InstallInfo>,
  titleMap: Record<string, { title: string; runner: Runner }>
): PerGamePathIssue[] {
  const issues: PerGamePathIssue[] = []
  const candidates = new Set<string>([
    ...appNames,
    ...Object.keys(installMap),
    ...Object.keys(titleMap)
  ])

  for (const appName of candidates) {
    const install = installMap[appName]
    const prefix = readPerGamePrefix(zip, appName)
    const title = titleMap[appName]?.title ?? appName
    const runner =
      titleMap[appName]?.runner ?? install?.runner ?? 'sideload'

    const installBroken = install?.installPath && !existsSync(install.installPath)
    const prefixBroken = prefix && !existsSync(prefix)
    if (!installBroken && !prefixBroken) continue

    issues.push({
      appName,
      title,
      runner,
      installPath: install?.installPath,
      installPathIssue: installBroken ? 'broken' : undefined,
      prefixPath: prefix,
      prefixPathIssue: prefixBroken ? 'broken' : undefined
    })
  }

  return issues
}

function buildWineVersionIssues(zip: AdmZip): WineVersionIssue[] {
  const entry = zip.getEntry(BACKUP_PATHS.wineMetadata.store)
  if (!entry) return []
  const data = safeJsonParse<{ 'wine-releases'?: WineVersionInfo[] }>(
    entry.getData()
  )
  const backupVersions = data?.['wine-releases']
  if (!Array.isArray(backupVersions)) return []

  const localVersions = wineDownloaderInfoStore.get('wine-releases', [])
  const installedLocally = new Set(
    localVersions.filter((v) => v.isInstalled).map((v) => v.version)
  )
  const availableLocally = new Set(localVersions.map((v) => v.version))

  const issues: WineVersionIssue[] = []
  for (const v of backupVersions) {
    if (!v?.isInstalled) continue
    if (installedLocally.has(v.version)) continue
    issues.push({
      displayName: v.version,
      version: v.version,
      downloadable: availableLocally.has(v.version)
    })
  }
  return issues
}

export function validateHeroicBackup(
  sourcePath: string
): HeroicBackupValidationReport {
  const errors: string[] = []
  const warnings: string[] = []

  let zip: AdmZip
  try {
    zip = new AdmZip(sourcePath)
  } catch (error) {
    logWarning(
      ['Failed to open backup archive:', error],
      LogPrefix.ImportExport
    )
    return emptyReport(['Could not open archive', String(error)], [])
  }

  const rawManifest = getManifest(zip)
  if (!isHeroicBackupManifest(rawManifest)) {
    return emptyReport(['Archive is missing a valid manifest.json'], [])
  }

  const manifest = rawManifest
  const formatSupported = manifest.formatVersion <= BACKUP_FORMAT_VERSION
  if (!formatSupported) {
    errors.push(
      `Backup format version ${manifest.formatVersion} is newer than this Heroic build supports (${BACKUP_FORMAT_VERSION}).`
    )
  }

  const platformMatches = manifest.platform === toBackupPlatform()
  if (!platformMatches) {
    warnings.push(
      `This backup was created on ${manifest.platform}; current platform is ${toBackupPlatform()}. Install paths and prefixes may not be valid.`
    )
  }

  const perGameAppNames = listPerGameAppNames(zip)
  const titleMap = buildGameTitleMap(zip)
  const installMap = buildInstallMap(zip)
  const credentials = buildCredentialsReport(manifest, zip)
  const pathIssues = buildPathIssues(
    zip,
    perGameAppNames,
    installMap,
    titleMap
  )
  const installedOK = buildInstalledOK(installMap, titleMap)
  const missingWineVersions = buildWineVersionIssues(zip)

  return {
    ok: errors.length === 0,
    manifest,
    perGameAppNames,
    gameTitles: titleMap,
    platformMatches,
    formatSupported,
    credentials,
    pathIssues,
    installedOK,
    missingWineVersions,
    errors,
    warnings
  }
}

function toBackupPlatform(): 'linux' | 'darwin' | 'win32' {
  if (process.platform === 'darwin') return 'darwin'
  if (process.platform === 'win32') return 'win32'
  return 'linux'
}

function emptyReport(
  errors: string[],
  warnings: string[]
): HeroicBackupValidationReport {
  return {
    ok: false,
    manifest: {
      formatVersion: 0,
      createdAt: '',
      heroicVersion: '',
      platform: 'linux',
      stages: [],
      counts: {
        perGameSettings: 0,
        installedGames: {},
        credentials: {
          legendary: false,
          gog: false,
          nile: false,
          zoom: false
        },
        fixesIncluded: false,
        themesIncluded: false,
        wineVersions: 0,
        sideloadGames: 0
      }
    },
    perGameAppNames: [],
    gameTitles: {},
    platformMatches: false,
    formatSupported: false,
    credentials: [],
    pathIssues: [],
    installedOK: [],
    missingWineVersions: [],
    errors,
    warnings
  }
}
