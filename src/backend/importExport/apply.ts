import AdmZip from 'adm-zip'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { app } from 'electron'
import { join } from 'path'

import { logError, logInfo, LogPrefix } from 'backend/logger'
import { sendFrontendMessage } from 'backend/ipc'
import type {
  HeroicApplyOptions,
  HeroicApplyResult,
  HeroicApplyStageResult,
  HeroicBackupManifest,
  HeroicBackupStageId,
  HeroicRollbackSnapshot,
  PerGamePathOverride
} from 'common/types/importExport'
import type { WineManagerStatus, WineVersionInfo } from 'common/types'
import { LegendaryUser } from 'backend/storeManagers/legendary/user'
import { NileUser } from 'backend/storeManagers/nile/user'
import { configStore as gogConfigStore } from 'backend/storeManagers/gog/electronStores'
import { configStore as zoomConfigStore } from 'backend/storeManagers/zoom/electronStores'
import {
  installWineVersion,
  updateWineVersionInfos,
  wineDownloaderInfoStore
} from 'backend/wine/manager/utils'
import { importExportRollbackStore } from 'backend/constants/key_value_stores'
import { GlobalConfig } from 'backend/config'

import { exportHeroicBackup } from './export'
import { BACKUP_FORMAT_VERSION, BACKUP_PATHS } from './constants'
import { sourcePaths } from './paths'

const ROLLBACK_FILENAME = 'heroic-import-rollback.zip'

function rollbackArchivePath(): string {
  return join(app.getPath('userData'), ROLLBACK_FILENAME)
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

function writeEntry(zip: AdmZip, entryPath: string, destFile: string): boolean {
  const entry = zip.getEntry(entryPath)
  if (!entry) return false
  ensureDir(dirOf(destFile))
  writeFileSync(destFile, entry.getData())
  return true
}

function dirOf(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx >= 0 ? path.slice(0, idx) : path
}

function writeFolder(zip: AdmZip, zipPrefix: string, destDir: string): number {
  ensureDir(destDir)
  let written = 0
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(zipPrefix)) continue
    if (entry.isDirectory) continue
    const rel = entry.entryName.slice(zipPrefix.length)
    if (!rel) continue
    const dest = join(destDir, rel)
    ensureDir(dirOf(dest))
    writeFileSync(dest, entry.getData())
    written++
  }
  return written
}

interface InMemoryStoreShim {
  set(key: string, value: unknown): void
  clear(): void
}

function syncElectronStoreFromDisk(
  store: InMemoryStoreShim,
  filePath: string,
  warnings: string[],
  label: string
): void {
  if (!existsSync(filePath)) return
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    // electron-store keeps an in-memory copy that doesn't see external file
    // writes. Re-push every key so live code sees the restored state without
    // waiting for a Heroic restart.
    store.clear()
    for (const [key, value] of Object.entries(parsed)) {
      store.set(key, value)
    }
  } catch (err) {
    warnings.push(
      `Could not refresh ${label} credentials in memory: ${String(err)}`
    )
  }
}

function safeJsonFromEntry<T>(zip: AdmZip, entryPath: string): T | null {
  const entry = zip.getEntry(entryPath)
  if (!entry) return null
  try {
    return JSON.parse(entry.getData().toString('utf-8')) as T
  } catch {
    return null
  }
}

async function writePreApplySnapshot(
  stages: HeroicBackupStageId[]
): Promise<HeroicRollbackSnapshot | null> {
  const dest = rollbackArchivePath()
  const exportResult = await exportHeroicBackup({
    outputPath: dest,
    stages
  })
  if (!exportResult.success || !exportResult.manifest) {
    logError(
      ['Failed to write pre-apply rollback snapshot:', exportResult.error],
      LogPrefix.ImportExport
    )
    return null
  }
  const snapshot: HeroicRollbackSnapshot = {
    createdAt: new Date().toISOString(),
    archivePath: dest,
    stages,
    sourceManifest: exportResult.manifest
  }
  importExportRollbackStore.set('lastSnapshot', snapshot)
  return snapshot
}

function applyGlobalSettings(
  zip: AdmZip,
  options: HeroicApplyOptions,
  warnings: string[]
): HeroicApplyStageResult {
  if (!options.overwriteGlobalSettings) {
    return {
      stage: 'globalSettings',
      ok: true,
      message: 'Skipped: overwrite disabled by user'
    }
  }
  const wroteConfig = writeEntry(
    zip,
    BACKUP_PATHS.globalSettings.config,
    sourcePaths.globalConfig()
  )
  const fixesCount = writeFolder(
    zip,
    BACKUP_PATHS.globalSettings.fixesDir,
    sourcePaths.fixesDir()
  )

  const themesDir = currentCustomThemesPath()
  let themesCount = 0
  if (themesDir) {
    themesCount = writeFolder(
      zip,
      BACKUP_PATHS.globalSettings.themesDir,
      themesDir
    )
  } else {
    const entries = zip
      .getEntries()
      .filter((e) =>
        e.entryName.startsWith(BACKUP_PATHS.globalSettings.themesDir)
      )
    if (entries.length > 0) {
      warnings.push(
        'Backup includes themes but no customThemesPath is configured; themes were skipped.'
      )
    }
  }
  return {
    stage: 'globalSettings',
    ok: true,
    message: `config=${wroteConfig ? 'written' : 'missing'}, fixes=${fixesCount}, themes=${themesCount}`
  }
}

function currentCustomThemesPath(): string | undefined {
  try {
    const { customThemesPath } = GlobalConfig.get().getSettings()
    return customThemesPath || undefined
  } catch {
    return undefined
  }
}

function patchPerGameSettings(
  raw: Record<string, unknown>,
  appName: string,
  override: PerGamePathOverride | undefined
): Record<string, unknown> {
  if (!override) return raw
  const existing = raw[appName]
  if (!existing || typeof existing !== 'object') return raw
  const patched = { ...(existing as Record<string, unknown>) }
  if (override.useDefaultPrefix) {
    delete patched['winePrefix']
  } else if (override.prefixPath) {
    patched['winePrefix'] = override.prefixPath
  }
  return { ...raw, [appName]: patched }
}

function applyPerGameSettings(
  zip: AdmZip,
  options: HeroicApplyOptions
): HeroicApplyStageResult {
  const overrides = new Map<string, PerGamePathOverride>()
  for (const o of options.perGameOverrides) overrides.set(o.appName, o)

  ensureDir(sourcePaths.gamesConfigDir())

  let written = 0
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(BACKUP_PATHS.perGameSettings.dir)) continue
    if (entry.isDirectory) continue
    const rel = entry.entryName.slice(BACKUP_PATHS.perGameSettings.dir.length)
    if (!rel.endsWith('.json')) continue
    const appName = rel.slice(0, -'.json'.length)
    if (
      options.includedAppNames.length > 0 &&
      !options.includedAppNames.includes(appName)
    ) {
      continue
    }
    const raw = safeJsonFromEntry<Record<string, unknown>>(zip, entry.entryName)
    if (!raw) continue
    const override = overrides.get(appName)
    const patched = patchPerGameSettings(raw, appName, override)

    const dest = join(sourcePaths.gamesConfigDir(), rel)
    if (patched === raw) {
      writeFileSync(dest, entry.getData())
    } else {
      writeFileSync(dest, JSON.stringify(patched, null, 2))
    }
    written++
  }
  return {
    stage: 'perGameSettings',
    ok: true,
    message: `${written} file(s)`
  }
}

function applyCredentials(
  zip: AdmZip,
  options: HeroicApplyOptions,
  warnings: string[]
): HeroicApplyStageResult {
  const includeRunner = (r: 'legendary' | 'nile' | 'gog' | 'zoom'): boolean =>
    options.includedCredentials[r] !== false

  let wrote = 0
  if (includeRunner('legendary')) {
    ensureDir(dirOf(sourcePaths.legendary.user()))
    if (
      writeEntry(
        zip,
        BACKUP_PATHS.credentials.legendaryUser,
        sourcePaths.legendary.user()
      )
    )
      wrote++
  }
  if (includeRunner('nile')) {
    ensureDir(dirOf(sourcePaths.nile.user()))
    if (
      writeEntry(
        zip,
        BACKUP_PATHS.credentials.nileUser,
        sourcePaths.nile.user()
      )
    )
      wrote++
  }
  if (includeRunner('gog')) {
    ensureDir(dirOf(sourcePaths.gog.configFile()))
    if (
      writeEntry(
        zip,
        BACKUP_PATHS.credentials.gogConfig,
        sourcePaths.gog.configFile()
      )
    )
      wrote++
    // gogdl reads tokens directly from auth.json via `gogdl auth`. Without it,
    // the restored config.json says isLoggedIn=true but every call fails with
    // "invalid credentials" because gogdl has no access/refresh token to use.
    if (
      writeEntry(
        zip,
        BACKUP_PATHS.credentials.gogAuth,
        sourcePaths.gog.authFile()
      )
    )
      wrote++
  }
  if (includeRunner('zoom')) {
    ensureDir(dirOf(sourcePaths.zoom.configFile()))
    if (
      writeEntry(
        zip,
        BACKUP_PATHS.credentials.zoomConfig,
        sourcePaths.zoom.configFile()
      )
    )
      wrote++
    if (
      writeEntry(
        zip,
        BACKUP_PATHS.credentials.zoomToken,
        sourcePaths.zoom.tokenFile()
      )
    )
      wrote++
  }

  // Mirror runtime in-memory state so live code sees the restored login
  // without needing a full Heroic restart.
  try {
    if (includeRunner('legendary')) LegendaryUser.getUserInfo()
  } catch (err) {
    warnings.push(`Could not mirror Legendary credentials: ${String(err)}`)
  }
  try {
    if (includeRunner('nile')) void NileUser.getUserData()
  } catch (err) {
    warnings.push(`Could not mirror Nile credentials: ${String(err)}`)
  }
  if (includeRunner('gog')) {
    syncElectronStoreFromDisk(
      gogConfigStore,
      sourcePaths.gog.configFile(),
      warnings,
      'GOG'
    )
  }
  if (includeRunner('zoom')) {
    syncElectronStoreFromDisk(
      zoomConfigStore,
      sourcePaths.zoom.configFile(),
      warnings,
      'Zoom'
    )
  }

  return {
    stage: 'credentials',
    ok: true,
    message: `${wrote} credential file(s)`
  }
}

function patchLegendaryInstalled(
  raw: Record<string, { install_path?: string; [k: string]: unknown }>,
  overrides: Map<string, PerGamePathOverride>,
  gamesQueuedForDownload: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [appName, entry] of Object.entries(raw)) {
    const override = overrides.get(appName)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      gamesQueuedForDownload.push(appName)
      continue
    }
    if (override?.installPath) {
      out[appName] = { ...entry, install_path: override.installPath }
    } else {
      out[appName] = entry
    }
  }
  return out
}

function patchGogInstalled(
  raw: { installed?: Array<Record<string, unknown>> },
  overrides: Map<string, PerGamePathOverride>,
  gamesQueuedForDownload: string[]
): { installed: Array<Record<string, unknown>> } {
  const list = Array.isArray(raw.installed) ? raw.installed : []
  const patched: Array<Record<string, unknown>> = []
  for (const entry of list) {
    const appName = asStringKey(entry['appName'])
    const override = overrides.get(appName)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      gamesQueuedForDownload.push(appName)
      continue
    }
    if (override?.installPath) {
      patched.push({ ...entry, install_path: override.installPath })
    } else {
      patched.push(entry)
    }
  }
  return { ...raw, installed: patched }
}

function asStringKey(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function patchNileInstalled(
  raw: Array<Record<string, unknown>>,
  overrides: Map<string, PerGamePathOverride>,
  gamesQueuedForDownload: string[]
): Array<Record<string, unknown>> {
  const patched: Array<Record<string, unknown>> = []
  for (const entry of raw) {
    const id = asStringKey(entry['id'])
    const override = overrides.get(id)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      gamesQueuedForDownload.push(id)
      continue
    }
    if (override?.installPath) {
      patched.push({ ...entry, path: override.installPath })
    } else {
      patched.push(entry)
    }
  }
  return patched
}

function applyLibraryCache(
  zip: AdmZip,
  options: HeroicApplyOptions,
  gamesQueuedForDownload: string[]
): HeroicApplyStageResult {
  const overrides = new Map<string, PerGamePathOverride>()
  for (const o of options.perGameOverrides) overrides.set(o.appName, o)

  const legRaw = safeJsonFromEntry<
    Record<string, { install_path?: string; [k: string]: unknown }>
  >(zip, BACKUP_PATHS.libraryCache.legendaryInstalled)
  if (legRaw) {
    ensureDir(dirOf(sourcePaths.legendary.installed()))
    const patched = patchLegendaryInstalled(
      legRaw,
      overrides,
      gamesQueuedForDownload
    )
    writeFileSync(
      sourcePaths.legendary.installed(),
      JSON.stringify(patched, null, 2)
    )
  }

  writeEntry(
    zip,
    BACKUP_PATHS.libraryCache.legendaryThirdParty,
    sourcePaths.legendary.thirdPartyInstalled()
  )

  writeFolder(
    zip,
    BACKUP_PATHS.libraryCache.legendaryMetadataDir,
    sourcePaths.legendary.metadataDir()
  )

  const gogRaw = safeJsonFromEntry<{
    installed?: Array<Record<string, unknown>>
  }>(zip, BACKUP_PATHS.libraryCache.gogInstalled)
  if (gogRaw) {
    ensureDir(dirOf(sourcePaths.gog.installedFile()))
    const patched = patchGogInstalled(gogRaw, overrides, gamesQueuedForDownload)
    writeFileSync(
      sourcePaths.gog.installedFile(),
      JSON.stringify(patched, null, 2)
    )
  }

  const nileRaw = safeJsonFromEntry<Array<Record<string, unknown>>>(
    zip,
    BACKUP_PATHS.libraryCache.nileInstalled
  )
  if (nileRaw) {
    ensureDir(dirOf(sourcePaths.nile.installed()))
    const patched = patchNileInstalled(
      nileRaw,
      overrides,
      gamesQueuedForDownload
    )
    writeFileSync(
      sourcePaths.nile.installed(),
      JSON.stringify(patched, null, 2)
    )
  }

  writeEntry(
    zip,
    BACKUP_PATHS.libraryCache.nileLibraryFile,
    sourcePaths.nile.library()
  )

  // Library caches are verbatim copies — they're just title lookups.
  ensureDir(
    sourcePaths.libraryCache.legendary().replace(/legendary_library\.json$/, '')
  )
  writeEntry(
    zip,
    BACKUP_PATHS.libraryCache.legendaryLibrary,
    sourcePaths.libraryCache.legendary()
  )
  writeEntry(
    zip,
    BACKUP_PATHS.libraryCache.gogLibrary,
    sourcePaths.libraryCache.gog()
  )
  writeEntry(
    zip,
    BACKUP_PATHS.libraryCache.nileLibrary,
    sourcePaths.libraryCache.nile()
  )
  writeEntry(
    zip,
    BACKUP_PATHS.libraryCache.zoomLibrary,
    sourcePaths.libraryCache.zoom()
  )

  return { stage: 'libraryCache', ok: true }
}

function applySideloadLibrary(
  zip: AdmZip,
  options: HeroicApplyOptions,
  gamesQueuedForDownload: string[]
): HeroicApplyStageResult {
  const raw = safeJsonFromEntry<{
    games?: Array<
      { app_name?: string; install?: { install_path?: string } } & Record<
        string,
        unknown
      >
    >
  }>(zip, BACKUP_PATHS.sideloadLibrary.library)
  if (!raw)
    return { stage: 'sideloadLibrary', ok: true, message: 'Not in backup' }

  const overrides = new Map<string, PerGamePathOverride>()
  for (const o of options.perGameOverrides) overrides.set(o.appName, o)

  const games = Array.isArray(raw.games) ? raw.games : []
  const patched: Array<Record<string, unknown>> = []
  for (const game of games) {
    const appName = String(game.app_name ?? '')
    const override = overrides.get(appName)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      gamesQueuedForDownload.push(appName)
      continue
    }
    if (override?.installPath) {
      patched.push({
        ...game,
        install: { ...(game.install ?? {}), install_path: override.installPath }
      })
    } else {
      patched.push(game)
    }
  }

  ensureDir(dirOf(sourcePaths.sideload.library()))
  writeFileSync(
    sourcePaths.sideload.library(),
    JSON.stringify({ ...raw, games: patched }, null, 2)
  )

  return {
    stage: 'sideloadLibrary',
    ok: true,
    message: `${patched.length} game(s)`
  }
}

interface WineImportTracker {
  total: number
  pending: Set<string>
}

const wineImportTracker: WineImportTracker = {
  total: 0,
  pending: new Set<string>()
}

export function getWineImportProgressSnapshot() {
  return {
    completed: wineImportTracker.total - wineImportTracker.pending.size,
    total: wineImportTracker.total,
    pending: Array.from(wineImportTracker.pending)
  }
}

function emitWineImportProgress() {
  sendFrontendMessage('wineImportProgress', getWineImportProgressSnapshot())
}

async function applyWineMetadata(
  zip: AdmZip,
  options: HeroicApplyOptions,
  warnings: string[],
  wineVersionsQueuedForDownload: string[]
): Promise<HeroicApplyStageResult> {
  // Refresh local wine info so we can match versions against what's currently
  // available for download (spec requirement).
  try {
    await updateWineVersionInfos(true)
  } catch (err) {
    warnings.push(`Could not refresh wine versions: ${String(err)}`)
  }

  const backup = safeJsonFromEntry<{ 'wine-releases'?: WineVersionInfo[] }>(
    zip,
    BACKUP_PATHS.wineMetadata.store
  )
  const backupList = Array.isArray(backup?.['wine-releases'])
    ? backup['wine-releases']
    : []
  if (backupList.length === 0) {
    return { stage: 'wineMetadata', ok: true, message: 'Not in backup' }
  }

  const localList = wineDownloaderInfoStore.get('wine-releases', [])
  const installedLocal = new Set(
    localList.filter((v) => v.isInstalled).map((v) => v.version)
  )
  const knownLocal = new Map(localList.map((v) => [v.version, v]))
  const requested = new Set(options.includedWineVersions)

  if (requested.size === 0) {
    return {
      stage: 'wineMetadata',
      ok: true,
      message: 'No wine versions selected for download'
    }
  }

  const toInstall = backupList
    .filter(
      (v) =>
        v?.isInstalled &&
        !installedLocal.has(v.version) &&
        requested.has(v.version)
    )
    .map((v) => knownLocal.get(v.version))
    .filter((v): v is WineVersionInfo => !!v)

  for (const r of toInstall) {
    wineVersionsQueuedForDownload.push(r.version)
    wineImportTracker.pending.add(r.version)
  }
  wineImportTracker.total += toInstall.length
  emitWineImportProgress()

  // Fire downloads in parallel. Progress ticks reuse the existing
  // progressOfWineManager channel; aggregate completion is broadcast on the
  // wineImportProgress channel so the import wizard's Done step can show
  // "X of Y" and gate its Close + Restart buttons until all installs settle.
  for (const release of toInstall) {
    const onProgress = (state: WineManagerStatus) => {
      sendFrontendMessage('progressOfWineManager', release.version, state)
    }
    void installWineVersion(release, onProgress)
      .catch((err) => {
        logError(
          [`Background wine install failed for ${release.version}:`, err],
          LogPrefix.ImportExport
        )
      })
      .finally(() => {
        sendFrontendMessage('progressOfWineManager', release.version, {
          status: 'idle'
        })
        wineImportTracker.pending.delete(release.version)
        emitWineImportProgress()
      })
  }

  return {
    stage: 'wineMetadata',
    ok: true,
    message: `${toInstall.length} wine version(s) will be installled`
  }
}

export async function applyHeroicBackup(
  options: HeroicApplyOptions
): Promise<HeroicApplyResult> {
  const gamesQueuedForDownload: string[] = []
  const wineVersionsQueuedForDownload: string[] = []
  const warnings: string[] = []
  const errors: string[] = []

  let zip: AdmZip
  try {
    zip = new AdmZip(options.sourcePath)
  } catch (err) {
    return {
      ok: false,
      stages: [],
      gamesQueuedForDownload: [],
      wineVersionsQueuedForDownload: [],
      warnings: [],
      errors: [`Could not open archive: ${String(err)}`]
    }
  }

  const manifest = safeJsonFromEntry<HeroicBackupManifest>(
    zip,
    BACKUP_PATHS.manifest
  )
  if (!manifest || manifest.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      stages: [],
      gamesQueuedForDownload: [],
      wineVersionsQueuedForDownload: [],
      warnings: [],
      errors: [
        'Archive manifest missing or uses an unsupported format version.'
      ]
    }
  }

  const snapshot = await writePreApplySnapshot(options.stages)
  if (!snapshot) {
    warnings.push('Could not create rollback snapshot; proceeding anyway.')
  }

  const stages: HeroicApplyStageResult[] = []

  try {
    if (options.stages.includes('globalSettings')) {
      stages.push(applyGlobalSettings(zip, options, warnings))
    }
    if (options.stages.includes('perGameSettings')) {
      stages.push(applyPerGameSettings(zip, options))
    }
    if (options.stages.includes('credentials')) {
      stages.push(applyCredentials(zip, options, warnings))
    }
    if (options.stages.includes('libraryCache')) {
      stages.push(applyLibraryCache(zip, options, gamesQueuedForDownload))
    }
    if (options.stages.includes('sideloadLibrary')) {
      stages.push(applySideloadLibrary(zip, options, gamesQueuedForDownload))
    }
    if (options.stages.includes('wineMetadata')) {
      stages.push(
        await applyWineMetadata(
          zip,
          options,
          warnings,
          wineVersionsQueuedForDownload
        )
      )
    }
  } catch (err) {
    logError(['Apply failed:', err], LogPrefix.ImportExport)
    errors.push(String(err))
    return {
      ok: false,
      stages,
      rollbackPath: snapshot?.archivePath,
      gamesQueuedForDownload,
      wineVersionsQueuedForDownload,
      warnings,
      errors
    }
  }

  logInfo(
    [
      'Applied Heroic backup from',
      options.sourcePath,
      `— ${stages.length} stage(s), ${gamesQueuedForDownload.length} game(s) queued for download`
    ],
    LogPrefix.ImportExport
  )

  return {
    ok: true,
    stages,
    rollbackPath: snapshot?.archivePath,
    gamesQueuedForDownload,
    wineVersionsQueuedForDownload,
    warnings,
    errors
  }
}

export async function rollbackLastImport(): Promise<HeroicApplyResult> {
  const snapshot =
    importExportRollbackStore.get_nodefault('lastSnapshot') ?? undefined
  if (!snapshot || !existsSync(snapshot.archivePath)) {
    return {
      ok: false,
      stages: [],
      gamesQueuedForDownload: [],
      wineVersionsQueuedForDownload: [],
      warnings: [],
      errors: ['No rollback snapshot available.']
    }
  }

  const result = await applyHeroicBackup({
    sourcePath: snapshot.archivePath,
    stages: snapshot.stages,
    overwriteGlobalSettings: true,
    includedAppNames: [],
    includedCredentials: {
      legendary: true,
      gog: true,
      nile: true,
      zoom: true
    },
    perGameOverrides: [],
    includedWineVersions: []
  })

  if (result.ok) {
    try {
      rmSync(snapshot.archivePath, { force: true })
    } catch (err) {
      logError(
        ['Could not delete rollback snapshot after use:', err],
        LogPrefix.ImportExport
      )
    }
    importExportRollbackStore.delete('lastSnapshot')
  }

  return result
}
