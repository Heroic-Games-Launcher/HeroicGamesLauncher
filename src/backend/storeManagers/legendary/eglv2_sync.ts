import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  watch,
  writeFileSync
} from 'graceful-fs'
import type { FSWatcher } from 'fs'
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
  moveGame: (appName: string, dir: string) => Promise<boolean>
  isOwned: (appName: string) => boolean
}

export interface SyncPaths {
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
export function getEglv2DataDir(): string {
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
  installationId: string
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
    launchExecutable: game.executable,
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
  // EGLv2 runs Windows builds through Proton; DLCs share their base game's
  // folder and aren't handled yet
  const heroicGames = new Map(
    installed
      .filter((game) => game.platform === 'Windows' && !game.is_dlc)
      .map((game) => [game.app_name, game])
  )
  const eglGames = new Map<string, Eglv2Installation>()
  for (const record of readEglv2Installations(paths.eglv2DataDir).values()) {
    if (record.artifactId && record.dir && isWindowsRecord(record)) {
      eglGames.set(record.artifactId, record)
    }
  }

  const toAppend: Eglv2Installation[] = []
  const nextSynced: Record<string, SyncedGame> = {}
  const skip = (title: string, reason: string) => {
    logWarning([`EGL sync: skipping ${title}:`, reason], LogPrefix.Legendary)
    result.skipped.push({ title, reason })
  }
  const filesPresent = (dir: string, executable?: string) =>
    existsSync(executable ? join(dir, executable) : dir)

  const appNames = new Set([...heroicGames.keys(), ...eglGames.keys()])
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
        let { install_path: dir, version } = heroicGame
        let exportNeeded = eglGame.platform !== 'Windows'

        if (dir !== eglGame.dir) {
          if (last?.dir === eglGame.dir) {
            exportNeeded = true // Moved in Heroic
          } else if (last?.dir === dir && eglGame.dir) {
            // Moved in EGLv2
            if (!(await heroic.moveGame(appName, eglGame.dir))) {
              throw new Error('could not move the game in Heroic')
            }
            dir = eglGame.dir
            result.toHeroic.push(title)
          } else {
            skip(title, 'installed in a different folder in each launcher')
            continue
          }
        }

        if (version !== eglGame.version) {
          if (last?.version === eglGame.version) {
            exportNeeded = true // Updated in Heroic
          } else if (last?.version === version && eglGame.version) {
            // Updated in EGLv2; re-importing makes Legendary pick up the
            // build that's now on disk
            if (
              !(await heroic.forgetGame(appName)) ||
              !(await heroic.importGame(appName, dir))
            ) {
              throw new Error('could not update the game in Heroic')
            }
            version = eglGame.version
            result.toHeroic.push(title)
          } else {
            skip(title, 'installed at a different version in each launcher')
            continue
          }
        }

        if (exportNeeded) {
          toAppend.push(exportGame(paths, heroicGame, eglGame.installationId))
          result.toEgl.push(title)
        }
        nextSynced[appName] = { dir, version }
      } else if (heroicGame) {
        const { install_path: dir, executable } = heroicGame
        if (last && !filesPresent(dir, executable)) {
          // Uninstalled in EGLv2
          if (!(await heroic.forgetGame(appName))) {
            throw new Error('could not remove the game from Heroic')
          }
          result.removedFromHeroic.push(title)
          continue
        }
        toAppend.push(
          exportGame(paths, heroicGame, installationIdFor(heroicGame))
        )
        result.toEgl.push(title)
        nextSynced[appName] = { dir, version: heroicGame.version }
      } else if (eglGame?.dir) {
        if (eglGame.complete === false) continue
        const { dir, launchExecutable } = eglGame
        if (last && !filesPresent(dir, launchExecutable)) {
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
        if (!(await heroic.importGame(appName, dir))) {
          throw new Error('could not import the game into Heroic')
        }
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
let watcher: FSWatcher | undefined

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

/** Starts syncing on changes to EGLv2's installations log */
export function startEglv2Sync(actions: HeroicActions) {
  heroicActions = actions
  if (!isLinux || watcher) return
  const eglv2DataDir = getEglv2DataDir()
  // Not installed (yet); Heroic-side changes are still synced
  if (!existsSync(eglv2DataDir)) {
    scheduleEglv2Sync()
    return
  }
  try {
    // EGLv2 replaces the log when compacting it, so watch the folder
    watcher = watch(eglv2DataDir, (_, filename) => {
      if (filename === 'installations.jsonl') scheduleEglv2Sync()
    })
  } catch (error) {
    logWarning(
      ['Could not watch the Epic Games Launcher data folder:', error],
      LogPrefix.Legendary
    )
  }
  scheduleEglv2Sync()
}
