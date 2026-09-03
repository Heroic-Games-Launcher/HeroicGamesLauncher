import AdmZip from 'adm-zip'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { app } from 'electron'
import { isAbsolute, join, normalize } from 'path'

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
import type {
  InstallPlatform,
  Runner,
  WineManagerStatus,
  WineVersionInfo
} from 'common/types'
import { LegendaryUser } from 'backend/storeManagers/legendary/user'
import { NileUser } from 'backend/storeManagers/nile/user'
import { configStore as gogConfigStore } from 'backend/storeManagers/gog/electronStores'
import { configStore as zoomConfigStore } from 'backend/storeManagers/zoom/electronStores'
import { legendaryInstalled } from 'backend/storeManagers/legendary/constants'
import { nileInstalled } from 'backend/storeManagers/nile/constants'
import {
  gogConfigPath,
  gogInstalledConfigPath
} from 'backend/storeManagers/gog/constants'
import { zoomConfigPath } from 'backend/storeManagers/zoom/constants'
import { sideloadLibraryPath } from 'backend/storeManagers/sideload/constants'
import { libraryManagerMap } from 'backend/storeManagers'
import { addToQueue } from 'backend/downloadmanager/downloadqueue'
import {
  installWineVersion,
  removeWineVersion,
  updateWineVersionInfos,
  wineDownloaderInfoStore
} from 'backend/wine/manager/utils'
import {
  configStore,
  importExportRollbackStore
} from 'backend/constants/key_value_stores'
import { GlobalConfig } from 'backend/config'

import { exportHeroicBackup } from './export'
import { isHeroicBackupManifest } from './validate'
import { BACKUP_FORMAT_VERSION, BACKUP_PATHS } from './constants'
import { sourcePaths } from './paths'

const ROLLBACK_FILENAME = 'heroic-import-rollback.zip'

function rollbackArchivePath(): string {
  return join(app.getPath('userData'), ROLLBACK_FILENAME)
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

interface WriteEntryOptions {
  removeIfMissing?: boolean
  mode?: number
}

function writeEntry(
  zip: AdmZip,
  entryPath: string,
  destFile: string,
  { removeIfMissing = false, mode }: WriteEntryOptions = {}
): boolean {
  const entry = zip.getEntry(entryPath)
  if (!entry) {
    if (removeIfMissing) rmSync(destFile, { force: true })
    return false
  }
  ensureDir(dirOf(destFile))
  writeFileSync(destFile, entry.getData(), mode ? { mode } : undefined)
  return true
}

function dirOf(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx >= 0 ? path.slice(0, idx) : path
}

function safeZipRel(rel: string): string | null {
  if (!rel || rel.includes('\0')) return null
  const normalized = normalize(rel)
  if (isAbsolute(normalized)) return null
  if (
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('..\\')
  ) {
    return null
  }
  return normalized
}

function writeFolder(zip: AdmZip, zipPrefix: string, destDir: string): number {
  ensureDir(destDir)
  let written = 0
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(zipPrefix)) continue
    if (entry.isDirectory) continue
    const rel = safeZipRel(entry.entryName.slice(zipPrefix.length))
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
  label: string,
  clearWhenMissing = false
): void {
  if (!existsSync(filePath)) {
    if (clearWhenMissing) store.clear()
    return
  }
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
  if (wroteConfig) {
    try {
      GlobalConfig.get().reloadFromFile()
    } catch (err) {
      warnings.push(`Could not reload global settings cache: ${String(err)}`)
    }
  }
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
  options: HeroicApplyOptions,
  restore = false
): HeroicApplyStageResult {
  const overrides = new Map<string, PerGamePathOverride>()
  for (const o of options.perGameOverrides) overrides.set(o.appName, o)

  ensureDir(sourcePaths.gamesConfigDir())

  if (restore) {
    for (const file of readdirSync(sourcePaths.gamesConfigDir())) {
      if (!file.endsWith('.json')) continue
      if (!zip.getEntry(`${BACKUP_PATHS.perGameSettings.dir}${file}`)) {
        rmSync(join(sourcePaths.gamesConfigDir(), file), { force: true })
      }
    }
  }

  let written = 0
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(BACKUP_PATHS.perGameSettings.dir)) continue
    if (entry.isDirectory) continue
    const rel = entry.entryName.slice(BACKUP_PATHS.perGameSettings.dir.length)
    if (!rel.endsWith('.json')) continue
    if (rel.includes('/') || rel.includes('\\')) continue
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

async function applyCredentials(
  zip: AdmZip,
  options: HeroicApplyOptions,
  warnings: string[],
  restore = false
): Promise<HeroicApplyStageResult> {
  const includeRunner = (r: Runner): boolean =>
    options.includedCredentials[r] !== false

  const credentialOpts: WriteEntryOptions = {
    removeIfMissing: restore,
    mode: 0o600
  }

  let wrote = 0
  for (const runner of Object.keys(libraryManagerMap) as Runner[]) {
    const { credentials } = libraryManagerMap[runner].getBackupPaths()
    if (credentials.length === 0 || !includeRunner(runner)) continue
    for (const file of credentials) {
      ensureDir(dirOf(file.source()))
      if (writeEntry(zip, file.destInZip, file.source(), credentialOpts))
        wrote++
    }
  }

  // Mirror runtime in-memory state so live code sees the restored login
  // without needing a full Heroic restart.
  try {
    if (includeRunner('legendary')) LegendaryUser.getUserInfo()
  } catch (err) {
    warnings.push(`Could not mirror Legendary credentials: ${String(err)}`)
  }
  try {
    if (includeRunner('nile')) await NileUser.getUserData()
  } catch (err) {
    warnings.push(`Could not mirror Nile credentials: ${String(err)}`)
  }
  if (includeRunner('gog')) {
    syncElectronStoreFromDisk(
      gogConfigStore,
      gogConfigPath,
      warnings,
      'GOG',
      restore
    )
  }
  if (includeRunner('zoom')) {
    syncElectronStoreFromDisk(
      zoomConfigStore,
      zoomConfigPath,
      warnings,
      'Zoom',
      restore
    )
  }

  return {
    stage: 'credentials',
    ok: true,
    message: `${wrote} credential file(s)`
  }
}

interface QueuedGameDownload {
  appName: string
  runner: Runner
  platform: InstallPlatform
  installPath?: string
}

function entryPlatform(v: unknown, fallback: InstallPlatform): InstallPlatform {
  return typeof v === 'string' ? (v as InstallPlatform) : fallback
}

function patchLegendaryInstalled(
  raw: Record<string, { install_path?: string; [k: string]: unknown }>,
  overrides: Map<string, PerGamePathOverride>,
  queuedDownloads: QueuedGameDownload[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [appName, entry] of Object.entries(raw)) {
    const override = overrides.get(appName)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      queuedDownloads.push({
        appName,
        runner: 'legendary',
        platform: entryPlatform(entry['platform'], 'Windows'),
        installPath: override.installPath
      })
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
  queuedDownloads: QueuedGameDownload[]
): { installed: Array<Record<string, unknown>> } {
  const list = Array.isArray(raw.installed) ? raw.installed : []
  const patched: Array<Record<string, unknown>> = []
  for (const entry of list) {
    const appName = asStringKey(entry['appName'])
    const override = overrides.get(appName)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      queuedDownloads.push({
        appName,
        runner: 'gog',
        platform: entryPlatform(entry['platform'], 'windows'),
        installPath: override.installPath
      })
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
  queuedDownloads: QueuedGameDownload[]
): Array<Record<string, unknown>> {
  const patched: Array<Record<string, unknown>> = []
  for (const entry of raw) {
    const id = asStringKey(entry['id'])
    const override = overrides.get(id)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      queuedDownloads.push({
        appName: id,
        runner: 'nile',
        platform: 'Windows',
        installPath: override.installPath
      })
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
  queuedDownloads: QueuedGameDownload[],
  restore = false
): HeroicApplyStageResult {
  const overrides = new Map<string, PerGamePathOverride>()
  for (const o of options.perGameOverrides) overrides.set(o.appName, o)

  const restoreOpts: WriteEntryOptions = { removeIfMissing: restore }

  const legRaw = safeJsonFromEntry<
    Record<string, { install_path?: string; [k: string]: unknown }>
  >(zip, BACKUP_PATHS.libraryCache.legendaryInstalled)
  if (legRaw) {
    ensureDir(dirOf(legendaryInstalled))
    const patched = patchLegendaryInstalled(legRaw, overrides, queuedDownloads)
    writeFileSync(legendaryInstalled, JSON.stringify(patched, null, 2))
  } else if (restore) {
    rmSync(legendaryInstalled, { force: true })
  }

  const gogRaw = safeJsonFromEntry<{
    installed?: Array<Record<string, unknown>>
  }>(zip, BACKUP_PATHS.libraryCache.gogInstalled)
  if (gogRaw) {
    ensureDir(dirOf(gogInstalledConfigPath))
    const patched = patchGogInstalled(gogRaw, overrides, queuedDownloads)
    writeFileSync(gogInstalledConfigPath, JSON.stringify(patched, null, 2))
  } else if (restore) {
    rmSync(gogInstalledConfigPath, { force: true })
  }

  const nileRaw = safeJsonFromEntry<Array<Record<string, unknown>>>(
    zip,
    BACKUP_PATHS.libraryCache.nileInstalled
  )
  if (nileRaw) {
    ensureDir(dirOf(nileInstalled))
    const patched = patchNileInstalled(nileRaw, overrides, queuedDownloads)
    writeFileSync(nileInstalled, JSON.stringify(patched, null, 2))
  } else if (restore) {
    rmSync(nileInstalled, { force: true })
  }

  for (const runner of Object.keys(libraryManagerMap) as Runner[]) {
    const { libraryCache } = libraryManagerMap[runner].getBackupPaths()
    for (const file of libraryCache) {
      if (file.kind === 'dir') {
        writeFolder(zip, file.destInZip, file.source())
      } else {
        writeEntry(zip, file.destInZip, file.source(), restoreOpts)
      }
    }
  }

  return { stage: 'libraryCache', ok: true }
}

function applySideloadLibrary(
  zip: AdmZip,
  options: HeroicApplyOptions,
  queuedDownloads: QueuedGameDownload[],
  restore = false
): HeroicApplyStageResult {
  const raw = safeJsonFromEntry<{
    games?: Array<
      { app_name?: string; install?: { install_path?: string } } & Record<
        string,
        unknown
      >
    >
  }>(zip, BACKUP_PATHS.sideloadLibrary.library)
  if (!raw) {
    if (restore) rmSync(sideloadLibraryPath, { force: true })
    return { stage: 'sideloadLibrary', ok: true, message: 'Not in backup' }
  }

  const overrides = new Map<string, PerGamePathOverride>()
  for (const o of options.perGameOverrides) overrides.set(o.appName, o)

  const games = Array.isArray(raw.games) ? raw.games : []
  const patched: Array<Record<string, unknown>> = []
  for (const game of games) {
    const appName = String(game.app_name ?? '')
    const override = overrides.get(appName)
    if (override?.skipInstallPath) continue
    if (override?.installAfterImport) {
      queuedDownloads.push({
        appName,
        runner: 'sideload',
        platform: 'Windows'
      })
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

  ensureDir(dirOf(sideloadLibraryPath))
  writeFileSync(
    sideloadLibraryPath,
    JSON.stringify({ ...raw, games: patched }, null, 2)
  )

  return {
    stage: 'sideloadLibrary',
    ok: true,
    message: `${patched.length} game(s)`
  }
}

function applyCategories(zip: AdmZip): HeroicApplyStageResult {
  const raw = safeJsonFromEntry<Record<string, unknown>>(
    zip,
    BACKUP_PATHS.categories.file
  )
  if (!raw) return { stage: 'categories', ok: true, message: 'Not in backup' }

  const categories: Record<string, string[]> = {}
  for (const [name, games] of Object.entries(raw)) {
    if (!Array.isArray(games)) continue
    categories[name] = games.filter((g): g is string => typeof g === 'string')
  }

  configStore.set('games.customCategories', categories)
  return {
    stage: 'categories',
    ok: true,
    message: `${Object.keys(categories).length} category(ies)`
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
        requested.has(v.version) &&
        !wineImportTracker.pending.has(v.version)
    )
    .map((v) => knownLocal.get(v.version))
    .filter((v): v is WineVersionInfo => !!v)

  if (wineImportTracker.pending.size === 0) wineImportTracker.total = 0

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
    message: `${toInstall.length} wine version(s) will be installed`
  }
}

interface ApplyInternalOptions {
  rollbackMode?: boolean
}

let applyInProgress = false

export async function applyHeroicBackup(
  options: HeroicApplyOptions,
  internalOptions: ApplyInternalOptions = {}
): Promise<HeroicApplyResult> {
  if (applyInProgress) {
    return {
      ok: false,
      stages: [],
      gamesQueuedForDownload: [],
      wineVersionsQueuedForDownload: [],
      warnings: [],
      errors: ['Another backup import is already in progress.']
    }
  }
  applyInProgress = true
  try {
    return await doApplyHeroicBackup(options, internalOptions)
  } finally {
    applyInProgress = false
  }
}

async function doApplyHeroicBackup(
  options: HeroicApplyOptions,
  { rollbackMode = false }: ApplyInternalOptions = {}
): Promise<HeroicApplyResult> {
  const queuedDownloads: QueuedGameDownload[] = []
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
  if (
    !manifest ||
    !isHeroicBackupManifest(manifest) ||
    manifest.formatVersion > BACKUP_FORMAT_VERSION
  ) {
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

  let snapshot: HeroicRollbackSnapshot | null = null
  if (!rollbackMode) {
    snapshot = await writePreApplySnapshot(options.stages)
    if (!snapshot) {
      return {
        ok: false,
        stages: [],
        gamesQueuedForDownload: [],
        wineVersionsQueuedForDownload: [],
        warnings,
        errors: [
          'Could not create a rollback snapshot. Import aborted; nothing was changed.'
        ]
      }
    }
  }

  const stages: HeroicApplyStageResult[] = []

  try {
    if (options.stages.includes('globalSettings')) {
      stages.push(applyGlobalSettings(zip, options, warnings))
    }
    if (options.stages.includes('perGameSettings')) {
      stages.push(applyPerGameSettings(zip, options, rollbackMode))
    }
    if (options.stages.includes('credentials')) {
      stages.push(await applyCredentials(zip, options, warnings, rollbackMode))
    }
    if (options.stages.includes('libraryCache')) {
      stages.push(
        applyLibraryCache(zip, options, queuedDownloads, rollbackMode)
      )
    }
    if (options.stages.includes('sideloadLibrary')) {
      stages.push(
        applySideloadLibrary(zip, options, queuedDownloads, rollbackMode)
      )
    }
    if (options.stages.includes('categories')) {
      stages.push(applyCategories(zip))
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
      gamesQueuedForDownload: queuedDownloads.map((q) => q.appName),
      wineVersionsQueuedForDownload,
      warnings,
      errors
    }
  }

  if (!rollbackMode) {
    await queueGameDownloads(queuedDownloads, warnings)
  }

  if (snapshot && wineVersionsQueuedForDownload.length > 0) {
    const updated: HeroicRollbackSnapshot = {
      ...snapshot,
      wineVersionsInstalled: [...wineVersionsQueuedForDownload]
    }
    importExportRollbackStore.set('lastSnapshot', updated)
  }

  logInfo(
    [
      'Applied Heroic backup from',
      options.sourcePath,
      `— ${stages.length} stage(s), ${queuedDownloads.length} game(s) queued for download`
    ],
    LogPrefix.ImportExport
  )

  return {
    ok: true,
    stages,
    rollbackPath: snapshot?.archivePath,
    gamesQueuedForDownload: queuedDownloads.map((q) => q.appName),
    wineVersionsQueuedForDownload,
    warnings,
    errors
  }
}

async function queueGameDownloads(
  queued: QueuedGameDownload[],
  warnings: string[]
): Promise<void> {
  if (queued.length === 0) return

  const { defaultInstallPath } = GlobalConfig.get().getSettings()
  const refreshed = new Set<Runner>()

  for (const { appName, runner, platform, installPath } of queued) {
    if (runner === 'sideload') {
      warnings.push(
        `${appName} is sideloaded and cannot be downloaded automatically; add it again manually.`
      )
      continue
    }
    try {
      let gameInfo = libraryManagerMap[runner].getGameInfo(appName)
      if (!gameInfo && !refreshed.has(runner)) {
        refreshed.add(runner)
        await libraryManagerMap[runner].refresh()
        gameInfo = libraryManagerMap[runner].getGameInfo(appName)
      }
      if (!gameInfo) {
        warnings.push(
          `Could not queue ${appName} for download: not found in the ${runner} library.`
        )
        continue
      }
      await addToQueue({
        type: 'install',
        params: {
          appName,
          runner,
          gameInfo,
          path: installPath ?? defaultInstallPath,
          platformToInstall: platform
        },
        addToQueueTime: Date.now(),
        startTime: 0,
        endTime: 0
      })
    } catch (err) {
      warnings.push(`Could not queue ${appName} for download: ${String(err)}`)
    }
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

  const result = await applyHeroicBackup(
    {
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
    },
    { rollbackMode: true }
  )

  if (result.ok && snapshot.wineVersionsInstalled?.length) {
    const releases = wineDownloaderInfoStore.get('wine-releases', [])
    for (const version of snapshot.wineVersionsInstalled) {
      const release = releases.find(
        (r) => r.version === version && r.isInstalled
      )
      if (!release) continue
      try {
        await removeWineVersion(release)
      } catch (err) {
        result.warnings.push(
          `Could not remove wine version ${version}: ${String(err)}`
        )
      }
    }
  }

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
