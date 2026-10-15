import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  renameSync,
  writeFileSync
} from 'graceful-fs'
import { createHash } from 'crypto'
import { join } from 'path'
import { env } from 'process'

import { userHome } from 'backend/constants/paths'
import { isFlatpak, isLinux } from 'backend/constants/environment'
import { GlobalConfig } from 'backend/config'
import { TypeCheckedStoreBackend } from 'backend/electron_store'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import type { Eglv2SyncResult } from 'common/types'
import type {
  GameMetadata,
  InstalledJsonMetadata
} from 'common/types/legendary'
import { legendaryConfigPath } from './constants'

/**
 * Two-way sync between Heroic's Epic installs and the new Epic Games Launcher
 * (EGLv2), so a game installed in one shows up in the other without
 * downloading it again. Both launchers share the same game folder.
 *
 * EGLv2 keeps its installs in `installations.jsonl`, an append-only log that
 * it replays on startup (the last line per `installationId` wins, and
 * `{"installationId", "deleted": true}` lines remove one). While it runs it
 * only appends, so Heroic can append too; EGLv2 picks Heroic's changes up the
 * next time it starts. Each install also needs its build manifest in
 * `<install>/.egstore/<installationId>.manifest`.
 */

export interface Eglv2Installation {
  installationId: string
  complete?: boolean
  dir?: string
  platform?: string
  namespace?: string
  itemId?: string
  artifactId?: string
  version?: string
  tags?: string[]
  launchCommand?: string
  launchExecutable?: string
  parentInstallationId?: string
  writtenAt?: string
  deleted?: boolean
}

interface SyncedGame {
  dir: string
  version: string
}

/** What Heroic can do to its own library; injected to keep this testable */
export interface HeroicActions {
  importGame: (appName: string, dir: string) => Promise<boolean>
  forgetGame: (appName: string) => Promise<boolean>
  reloadGame: (appName: string) => void
  isOwned: (appName: string) => boolean
}

interface SyncPaths {
  legendaryConfigDir: string
  eglv2DataDir: string
}

const syncStore = new TypeCheckedStoreBackend('eglv2SyncStore', {
  cwd: 'store',
  name: 'eglv2Sync',
  clearInvalidConfig: true
})

// In Flatpak, `XDG_DATA_HOME` points inside the sandbox, but EGLv2 runs on
// the host, so prefer the host's data dir
function getEglv2DataDir(): string {
  const dataHome =
    env.HOST_XDG_DATA_HOME ||
    (!isFlatpak && env.XDG_DATA_HOME) ||
    join(userHome, '.local', 'share')
  return join(dataHome, 'com.epicgames.eglv2')
}

function defaultPaths(): SyncPaths {
  return {
    legendaryConfigDir: legendaryConfigPath,
    eglv2DataDir: getEglv2DataDir()
  }
}

function readJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return undefined
  }
}

/** Replays EGLv2's installations log into its live records */
export function readEglv2Installations(
  eglv2DataDir: string
): Map<string, Eglv2Installation> {
  const live = new Map<string, Eglv2Installation>()
  let lines: string[] = []
  try {
    lines = readFileSync(
      join(eglv2DataDir, 'installations.jsonl'),
      'utf-8'
    ).split('\n')
  } catch {
    return live
  }
  for (const line of lines) {
    let record: Eglv2Installation
    try {
      record = JSON.parse(line) as Eglv2Installation
    } catch {
      // Torn tail or blank line
      continue
    }
    // The first line is a header without an installationId
    if (!record?.installationId) continue
    if (record.deleted) live.delete(record.installationId)
    else live.set(record.installationId, record)
  }
  return live
}

function appendEglv2Records(
  eglv2DataDir: string,
  records: Eglv2Installation[]
) {
  if (!records.length) return
  const logPath = join(eglv2DataDir, 'installations.jsonl')
  mkdirSync(eglv2DataDir, { recursive: true })
  if (!existsSync(logPath)) {
    writeFileSync(
      logPath,
      JSON.stringify({ version: 1, writtenAt: now(), entries: 0 }) + '\n'
    )
  }
  const existing = readFileSync(logPath, 'utf-8')
  const prefix = existing && !existing.endsWith('\n') ? '\n' : ''
  appendFileSync(
    logPath,
    prefix + records.map((record) => JSON.stringify(record)).join('\n') + '\n'
  )
}

function now() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

// Mirrors Legendary's `clean_filename`
function cleanFilename(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '')
}

function findLegendaryManifest(
  configDir: string,
  game: InstalledJsonMetadata
): string | undefined {
  return [
    `${game.app_name}_${game.platform}_${game.version}`,
    `${game.app_name}_${game.version}`
  ]
    .map((name) =>
      join(configDir, 'manifests', `${cleanFilename(name)}.manifest`)
    )
    .find((path) => existsSync(path))
}

// EGL uses 32-char uppercase hex IDs. Derive one from the app name when
// Legendary has no EGL GUID, so repeated exports update the same record.
function installationIdFor(game: InstalledJsonMetadata) {
  if (game.egl_guid) return game.egl_guid.replace(/-/g, '').toUpperCase()
  return createHash('md5').update(game.app_name).digest('hex').toUpperCase()
}

function updateLegendaryInstall(
  paths: SyncPaths,
  game: InstalledJsonMetadata,
  eglGame: Eglv2Installation
) {
  const version = eglGame.version
  if (!version) throw new Error('EGL record has no version')
  const eglManifest = join(
    game.install_path,
    '.egstore',
    `${eglGame.installationId}.manifest`
  )
  if (!existsSync(eglManifest)) {
    throw new Error('missing build manifest from the Epic Games Launcher')
  }

  const installedPath = join(paths.legendaryConfigDir, 'installed.json')
  const installed =
    readJson<Record<string, InstalledJsonMetadata>>(installedPath)
  const record = installed?.[game.app_name]
  if (!installed || !record) throw new Error('not in installed.json')

  const manifestsDir = join(paths.legendaryConfigDir, 'manifests')
  mkdirSync(manifestsDir, { recursive: true })
  copyFileSync(
    eglManifest,
    join(
      manifestsDir,
      `${cleanFilename(`${game.app_name}_${game.platform}_${version}`)}.manifest`
    )
  )

  installed[game.app_name] = {
    ...record,
    version,
    executable: eglGame.launchExecutable || record.executable
  }
  const tmpPath = `${installedPath}.heroic-tmp`
  writeFileSync(tmpPath, JSON.stringify(installed, null, 2))
  renameSync(tmpPath, installedPath)
}

/**
 * Legendary only deletes the files listed in the game's manifest, so the
 * `.egstore` files EGLv2 needs would keep the install folder around
 */
function removeEgstoreFiles(dir: string, installationId: string) {
  const egstore = join(dir, '.egstore')
  for (const ext of ['manifest', 'mancpn']) {
    const file = join(egstore, `${installationId}.${ext}`)
    if (existsSync(file)) unlinkSync(file)
  }
  for (const folder of [egstore, dir]) {
    if (existsSync(folder) && !readdirSync(folder).length) rmdirSync(folder)
  }
}

function isWindowsRecord(record: Eglv2Installation) {
  return (
    record.platform === 'Windows' ||
    !!record.launchExecutable?.toLowerCase().endsWith('.exe')
  )
}

/**
 * Writes (or rewrites) a Heroic install into EGLv2. Throws if the game
 * can't be exported.
 */
function exportGame(
  paths: SyncPaths,
  game: InstalledJsonMetadata,
  installationId: string,
  parentInstallationId?: string
): Eglv2Installation {
  const metadata = readJson<GameMetadata>(
    join(paths.legendaryConfigDir, 'metadata', `${game.app_name}.json`)
  )
  const asset =
    metadata?.asset_infos[game.platform] ??
    Object.values(metadata?.asset_infos ?? {})[0]
  if (!asset) throw new Error('missing game metadata')
  const buildManifest = findLegendaryManifest(paths.legendaryConfigDir, game)
  if (!buildManifest) throw new Error('missing build manifest')

  // EGLv2 drops installs whose build manifest isn't in `.egstore`
  const egstore = join(game.install_path, '.egstore')
  mkdirSync(egstore, { recursive: true })
  copyFileSync(buildManifest, join(egstore, `${installationId}.manifest`))
  writeFileSync(
    join(egstore, `${installationId}.mancpn`),
    JSON.stringify(
      {
        FormatVersion: 0,
        AppName: game.app_name,
        CatalogItemId: asset.catalog_item_id,
        CatalogNamespace: asset.namespace
      },
      null,
      4
    )
  )

  return {
    installationId,
    complete: true,
    dir: game.install_path,
    platform: 'Windows',
    namespace: asset.namespace,
    itemId: asset.catalog_item_id,
    artifactId: game.app_name,
    version: game.version,
    tags: game.install_tags?.length ? game.install_tags : [''],
    launchCommand: game.launch_parameters ?? '',
    launchExecutable: game.is_dlc ? '' : game.executable,
    ...(parentInstallationId && { parentInstallationId }),
    writtenAt: now()
  }
}

/**
 * Reconciles both launchers once. A record of what was last in sync tells
 * which side changed: an install, uninstall, update or move on one side is
 * applied to the other.
 */
export async function syncWithEglv2(
  heroic: HeroicActions,
  paths: SyncPaths = defaultPaths(),
  synced: Record<string, SyncedGame> = syncStore.get('games', {})
): Promise<Eglv2SyncResult> {
  const result: Eglv2SyncResult = {
    toEgl: [],
    toHeroic: [],
    removedFromEgl: [],
    removedFromHeroic: [],
    skipped: []
  }

  const installed = Object.values(
    readJson<Record<string, InstalledJsonMetadata>>(
      join(paths.legendaryConfigDir, 'installed.json')
    ) ?? {}
  )
  // EGLv2 runs Windows builds through Proton
  const heroicGames = new Map(
    installed
      .filter((game) => game.platform === 'Windows')
      .map((game) => [game.app_name, game])
  )
  const eglRecords = readEglv2Installations(paths.eglv2DataDir)
  const eglGames = new Map<string, Eglv2Installation>()
  for (const record of eglRecords.values()) {
    if (
      record.artifactId &&
      record.dir &&
      (isWindowsRecord(record) || record.parentInstallationId)
    ) {
      eglGames.set(record.artifactId, record)
    }
  }

  // Heroic DLCs name their base game by catalog item ID, EGLv2 DLCs by
  // installation ID
  const appNameByCatalogId = new Map<string, string>()
  for (const game of heroicGames.values()) {
    const id = readJson<GameMetadata>(
      join(paths.legendaryConfigDir, 'metadata', `${game.app_name}.json`)
    )?.metadata.id
    if (id) appNameByCatalogId.set(id, game.app_name)
  }
  const heroicBaseOf = (dlc: InstalledJsonMetadata) => {
    const mainGameId = readJson<GameMetadata>(
      join(paths.legendaryConfigDir, 'metadata', `${dlc.app_name}.json`)
    )?.metadata.mainGameItem?.id
    return mainGameId ? appNameByCatalogId.get(mainGameId) : undefined
  }
  const eglBaseOf = (dlc: Eglv2Installation) =>
    dlc.parentInstallationId
      ? eglRecords.get(dlc.parentInstallationId)?.artifactId
      : undefined
  const isDlc = (appName: string) =>
    !!heroicGames.get(appName)?.is_dlc ||
    !!eglGames.get(appName)?.parentInstallationId

  const toAppend: Eglv2Installation[] = []
  const nextSynced: Record<string, SyncedGame> = {}
  const skip = (title: string, reason: string) => {
    logWarning([`EGL sync: skipping ${title}:`, reason], LogPrefix.Legendary)
    result.skipped.push({ title, reason })
  }
  const filesPresent = (dir: string, executable?: string) =>
    existsSync(executable ? join(dir, executable) : dir)

  // Base games first, so their DLCs can refer to them
  const appNames = [...new Set([...heroicGames.keys(), ...eglGames.keys()])]
  appNames.sort((a, b) => Number(isDlc(a)) - Number(isDlc(b)))
  const importedToHeroic = new Set<string>()
  const eglInstallationIdOf = (appName: string) => {
    const game = heroicGames.get(appName)
    return (
      eglGames.get(appName)?.installationId ??
      toAppend.find((record) => record.artifactId === appName)
        ?.installationId ??
      (game && installationIdFor(game))
    )
  }
  const exportToEgl = (game: InstalledJsonMetadata, installationId: string) => {
    if (!game.is_dlc) return exportGame(paths, game, installationId)
    const base = heroicBaseOf(game)
    const parentId = base && eglInstallationIdOf(base)
    if (!parentId) throw new Error('base game is not installed')
    return exportGame(paths, game, installationId, parentId)
  }

  for (const appName of appNames) {
    const heroicGame = heroicGames.get(appName)
    const eglGame = eglGames.get(appName)
    const last = synced[appName]
    const title = heroicGame?.title ?? appName

    try {
      if (heroicGame && eglGame) {
        // Downloads in progress settle on a later pass
        if (eglGame.complete === false) {
          if (last) nextSynced[appName] = last
          continue
        }
        const dir = heroicGame.install_path
        let version = heroicGame.version
        let exportNeeded = eglGame.platform !== 'Windows'

        if (dir !== eglGame.dir) {
          if (last?.dir === eglGame.dir) {
            exportNeeded = true // Moved in Heroic
          } else {
            skip(title, 'installed in a different folder in each launcher')
            continue
          }
        }

        if (version !== eglGame.version) {
          if (last?.version === eglGame.version) {
            exportNeeded = true // Updated in Heroic
          } else if (last?.version === version && eglGame.version) {
            // Updated in EGLv2
            updateLegendaryInstall(paths, heroicGame, eglGame)
            heroic.reloadGame(appName)
            version = eglGame.version
            result.toHeroic.push(title)
          } else {
            skip(title, 'installed at a different version in each launcher')
            continue
          }
        }

        if (exportNeeded) {
          toAppend.push(exportToEgl(heroicGame, eglGame.installationId))
          result.toEgl.push(title)
        }
        nextSynced[appName] = { dir, version }
      } else if (heroicGame) {
        const { install_path: dir, executable } = heroicGame
        if (last && (heroicGame.is_dlc || !filesPresent(dir, executable))) {
          // Uninstalled in EGLv2
          if (!(await heroic.forgetGame(appName))) {
            throw new Error('could not remove the game from Heroic')
          }
          result.removedFromHeroic.push(title)
          continue
        }
        toAppend.push(exportToEgl(heroicGame, installationIdFor(heroicGame)))
        result.toEgl.push(title)
        nextSynced[appName] = { dir, version: heroicGame.version }
      } else if (eglGame?.dir) {
        if (eglGame.complete === false) continue
        const { dir, launchExecutable } = eglGame
        const eglBase = eglBaseOf(eglGame)
        if (
          last &&
          (eglGame.parentInstallationId || !filesPresent(dir, launchExecutable))
        ) {
          // Uninstalled in Heroic
          toAppend.push({
            installationId: eglGame.installationId,
            deleted: true,
            writtenAt: now()
          })
          removeEgstoreFiles(dir, eglGame.installationId)
          result.removedFromEgl.push(title)
          continue
        }
        if (!heroic.isOwned(appName)) {
          skip(title, 'not in your Heroic library')
          continue
        }
        if (eglGame.parentInstallationId) {
          // Importing the base game also imports its DLCs
          if (eglBase && importedToHeroic.has(eglBase)) continue
          if (!eglBase || !heroicGames.has(eglBase)) {
            skip(title, 'base game is not installed in Heroic')
            continue
          }
        }
        if (!(await heroic.importGame(appName, dir))) {
          throw new Error('could not import the game into Heroic')
        }
        importedToHeroic.add(appName)
        result.toHeroic.push(title)
        nextSynced[appName] = { dir, version: eglGame.version ?? '' }
      }
    } catch (error) {
      skip(title, error instanceof Error ? error.message : String(error))
      if (last) nextSynced[appName] = last
    }
  }

  appendEglv2Records(paths.eglv2DataDir, toAppend)
  syncStore.set('games', nextSynced)

  const changes =
    result.toEgl.length +
    result.toHeroic.length +
    result.removedFromEgl.length +
    result.removedFromHeroic.length
  if (changes) {
    logInfo(
      [
        'EGL sync:',
        `${result.toEgl.length} to EGL,`,
        `${result.toHeroic.length} to Heroic,`,
        `${result.removedFromEgl.length} removed from EGL,`,
        `${result.removedFromHeroic.length} removed from Heroic`
      ],
      LogPrefix.Legendary
    )
  }
  return result
}

let heroicActions: HeroicActions | undefined
let running: Promise<Eglv2SyncResult | undefined> | undefined
let rerun = false
let debounce: NodeJS.Timeout | undefined

function isEnabled() {
  return isLinux && !!GlobalConfig.get().getSettings().eglv2Sync
}

/** Runs a sync now, or right after the one in progress */
export async function runEglv2Sync(): Promise<Eglv2SyncResult | undefined> {
  if (!heroicActions) return
  if (running) {
    rerun = true
    return running
  }
  running = syncWithEglv2(heroicActions)
    .catch((error) => {
      logError(['EGL sync failed:', error], LogPrefix.Legendary)
      return undefined
    })
    .finally(() => {
      running = undefined
      if (rerun) {
        rerun = false
        scheduleEglv2Sync()
      }
    })
  return running
}

/** Debounced sync, for callers reacting to install state changes */
export function scheduleEglv2Sync() {
  if (!heroicActions || !isEnabled()) return
  clearTimeout(debounce)
  debounce = setTimeout(() => void runEglv2Sync(), 2000)
}

export function startEglv2Sync(actions: HeroicActions) {
  heroicActions = actions
  scheduleEglv2Sync()
}
