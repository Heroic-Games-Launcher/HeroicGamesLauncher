import { existsSync } from 'graceful-fs'
import { GameConfig } from '../../game_config'
import {
  ExtraInfo,
  GameAchievement,
  GameInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstallPlatform,
  Reqs,
  REQS_OTHER_TITLE,
  Status
} from 'common/types'
import {
  logError,
  logInfo,
  logWarning,
  LogPrefix,
  createGameLogWriter
} from 'backend/logger'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import {
  GameManager,
  InstallResult,
  RemoveArgs
} from 'common/types/game_manager'
import { sendGameStatusUpdate } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { GlobalConfig } from 'backend/config'
import { libraryManagerMap } from '..'
import { configStore, extraInfoStore } from './electronStores'
import { steamCdnImageBase, steamStoreAppUrl } from './constants'
import {
  runAurelia,
  fetchAureliaInfo,
  parseAureliaJson,
  makeAureliaProgressHandler,
  AureliaError,
  type AureliaAchievementsResponse
} from './aurelia'

import type LogWriter from 'backend/logger/log_writer'

function isSteamImportEnabled(): boolean {
  return !!GlobalConfig.get().getSettings().experimentalFeatures?.steamImport
}

function describeError(error: unknown): string {
  return error instanceof AureliaError ? error.message : String(error)
}

/**
 * Maps Heroic's install platform to Aurelia's `-p` value (`windows`/`linux`).
 * Returns undefined for anything else (e.g. macOS) so Aurelia auto-detects the
 * depot platform itself.
 */
function aureliaPlatform(platform: InstallPlatform): string | undefined {
  const lc = String(platform).toLowerCase()
  if (lc.startsWith('win')) return 'windows'
  if (lc.startsWith('lin')) return 'linux'
  return undefined
}

/**
 * Strips Steam's store-description markup (the `[p]…[/p]`, `[h2]`, `[list]`,
 * `[img]`, … BBCode-style tags Aurelia returns in `full_description`) down to
 * plain text, turning paragraph breaks into blank lines.
 */
function stripSteamMarkup(input?: string): string {
  if (!input) return ''
  return input
    .replace(/\[\/?p[^\]]*\]/gi, '\n')
    .replace(/\[\/?[a-z][^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Splits a single Steam requirement line ("OS: Windows 10") into a
 * `label -> value` pair, falling back to the full-width "Other" row when the
 * line has no recognisable label.
 */
function splitRequirement(line: string): [string, string] {
  const idx = line.indexOf(':')
  if (idx === -1) return [REQS_OTHER_TITLE, line.trim()]
  return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
}

/**
 * Builds Heroic's `Reqs[]` table (one labeled row per spec) from Aurelia's
 * minimum/recommended requirement line arrays, matching how the other runners
 * populate the game page's requirements table.
 */
function buildReqs(minimum: string[] = [], recommended: string[] = []): Reqs[] {
  const min = new Map<string, string>()
  const rec = new Map<string, string>()

  const collect = (lines: string[], target: Map<string, string>) => {
    for (const line of lines) {
      if (!line.trim()) continue
      const [label, value] = splitRequirement(line)
      target.set(
        label,
        target.has(label) ? `${target.get(label)}\n${value}` : value
      )
    }
  }
  collect(minimum, min)
  collect(recommended, rec)

  const labels: string[] = []
  for (const label of min.keys()) {
    if (label !== REQS_OTHER_TITLE) labels.push(label)
  }
  for (const label of rec.keys()) {
    if (label !== REQS_OTHER_TITLE && !labels.includes(label))
      labels.push(label)
  }

  const reqs: Reqs[] = labels.map((title) => ({
    title,
    minimum: min.get(title) ?? '',
    recommended: rec.get(title) ?? ''
  }))

  const other = [min.get(REQS_OTHER_TITLE), rec.get(REQS_OTHER_TITLE)]
    .filter(Boolean)
    .join('\n')
  if (other) {
    reqs.push({ title: REQS_OTHER_TITLE, minimum: other, recommended: '' })
  }

  return reqs
}

/**
 * Steam game manager.
 *
 * All operations are delegated to the bundled `aurelia` CLI (a standalone
 * command-line Steam client): Aurelia performs the downloads, launches, cloud
 * saves and metadata lookups itself, so Heroic no longer depends on the Steam
 * client being installed or running.
 */
export default class SteamGameManager implements GameManager {
  getGameInfo(appName: string): GameInfo {
    const info = libraryManagerMap['steam'].getGameInfo(appName)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${appName},`,
          'returning empty object. Something is probably gonna go wrong soon'
        ],
        LogPrefix.Steam
      )
      return {
        app_name: '',
        runner: 'steam',
        art_cover: '',
        art_square: '',
        install: {},
        is_installed: false,
        title: '',
        canRunOffline: false
      }
    }
    return info
  }

  async getSettings(appName: string): Promise<GameSettings> {
    return (
      GameConfig.get(appName).config ||
      (await GameConfig.get(appName).getSettings())
    )
  }

  async getExtraInfo(appName: string): Promise<ExtraInfo> {
    const cached = extraInfoStore.get(appName)
    if (cached) {
      return cached
    }

    const empty: ExtraInfo = {
      about: { description: '', shortDescription: '' },
      reqs: [],
      releaseDate: undefined,
      storeUrl: `${steamStoreAppUrl}/${appName}`,
      changelog: undefined,
      genres: []
    }

    if (!isSteamImportEnabled()) {
      return empty
    }

    // Only fetch details for games actually in the Heroic Steam library;
    // `info` logs on to Steam, so we don't spend a connection on unknown ids.
    if (!libraryManagerMap['steam'].getGameInfo(appName)) {
      return empty
    }

    try {
      // `fetchAureliaInfo` accepts several ids and batches them over one logon;
      // here we ask for a single game, so we take the first (and only) entry.
      const [details] = await fetchAureliaInfo([appName], { extended: true })
      if (!details) {
        return empty
      }

      // The rich fields (genres, requirements, metacritic, website) live under
      // `extended`; `--extended` populates it.
      const ext = details.extended ?? {}
      const assets = details.assets ?? {}

      const extraInfo: ExtraInfo = {
        about: {
          description:
            stripSteamMarkup(details.full_description) ||
            details.description ||
            '',
          shortDescription: details.description ?? ''
        },
        reqs: buildReqs(
          ext.requirements?.minimum,
          ext.requirements?.recommended
        ),
        releaseDate: details.release_date || undefined,
        storeUrl: ext.website || `${steamStoreAppUrl}/${appName}`,
        changelog: undefined,
        genres: ext.genres ?? [],
        // Prefer Aurelia's real artwork URLs, falling back to Steam's CDN.
        background:
          assets.hero ||
          assets.background ||
          `${steamCdnImageBase}/${appName}/library_hero.jpg`,
        cover: assets.header || `${steamCdnImageBase}/${appName}/header.jpg`,
        score:
          typeof ext.metacritic === 'number'
            ? String(ext.metacritic)
            : undefined
      }

      extraInfoStore.set(appName, extraInfo)
      return extraInfo
    } catch (error) {
      logError(
        [`Unable to get Steam store info for ${appName}`, describeError(error)],
        LogPrefix.Steam
      )
      return empty
    }
  }

  async getAchievements(
    appName: string,
    lang = 'en-US'
  ): Promise<GameAchievement[]> {
    if (!isSteamImportEnabled()) {
      return []
    }
    try {
      const res = await runAurelia<AureliaAchievementsResponse>([
        'achievements',
        appName,
        '-l',
        lang
      ])
      // Aurelia's achievement shape already lines up with Heroic's
      // GameAchievement (= GOGAchievement); the GOG-only rarity-level fields
      // have no Steam equivalent, so they're left blank.
      return (res.achievements ?? []).map((a) => ({
        achievement_id: a.achievement_id,
        achievement_key: a.achievement_key,
        visible: a.visible ?? true,
        name: a.name,
        description: a.description,
        image_url_unlocked: a.image_url_unlocked ?? '',
        image_url_locked: a.image_url_locked ?? '',
        rarity: a.rarity ?? 0,
        date_unlocked: a.date_unlocked ?? null,
        rarity_level_description: '',
        rarity_level_slug: ''
      }))
    } catch (error) {
      logWarning(
        [
          `Unable to get Steam achievements for ${appName}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
      return []
    }
  }

  /**
   * Enables or disables an owned DLC (`aurelia enable`/`disable <dlcAppId>`).
   *
   * The flag is flipped right away so the DLC list reflects it immediately, but
   * Steam rewrites `DisabledDLC` from memory when it exits, so the change is
   * also queued and re-applied with `--restart-steam` on the next Steam game
   * launch (see {@link applyPendingDlcChanges}) to make it permanent.
   */
  async setDlcEnabled(dlcAppId: string, enabled: boolean): Promise<void> {
    if (!isSteamImportEnabled()) {
      return
    }
    const verb = enabled ? 'enable' : 'disable'
    try {
      await runAurelia([verb, dlcAppId])
    } catch (error) {
      logError(
        [`Unable to ${verb} Steam DLC ${dlcAppId}`, describeError(error)],
        LogPrefix.Steam
      )
      throw error
    }

    const pending = configStore
      .get('pendingDlc', [])
      .filter((change) => change.appId !== dlcAppId)
    pending.push({ appId: dlcAppId, enable: enabled })
    configStore.set('pendingDlc', pending)
  }

  /**
   * Makes any queued DLC enable/disable permanent by re-applying it with
   * `--restart-steam` (stop Steam → edit the manifest → start Steam). Called
   * just before launching a Steam game, since that's a natural point to cycle
   * Steam and the only reliable way to keep the `DisabledDLC` edits.
   */
  private async applyPendingDlcChanges(): Promise<void> {
    const pending = configStore.get('pendingDlc', [])
    if (!pending.length) {
      return
    }
    logInfo(
      `Applying ${pending.length} pending Steam DLC change(s) with a Steam restart`,
      LogPrefix.Steam
    )
    for (const change of pending) {
      try {
        await runAurelia([
          change.enable ? 'enable' : 'disable',
          change.appId,
          '--restart-steam'
        ])
      } catch (error) {
        logWarning(
          [
            `Unable to apply pending DLC change for ${change.appId}`,
            describeError(error)
          ],
          LogPrefix.Steam
        )
      }
    }
    configStore.delete('pendingDlc')
  }

  /**
   * Runs one of Aurelia's streaming maintenance commands (install/update/verify/
   * move), forwarding its NDJSON `progress` events to the download manager and
   * validating the final result object.
   */
  private async runStreamingCommand(
    appName: string,
    commandParts: string[],
    status: Status,
    logType: 'install' | 'update' | 'repair'
  ): Promise<InstallResult> {
    const logWriter = await createGameLogWriter(appName, 'steam', logType)
    const res = await libraryManagerMap['steam'].runRunnerCommand(
      [...commandParts, '--json'],
      {
        abortId: appName,
        logWriters: [logWriter],
        onOutput: makeAureliaProgressHandler(appName, status),
        logMessagePrefix: `${status} ${appName}`
      }
    )

    if (res.abort) {
      return { status: 'abort' }
    }
    if (res.error && !res.error.includes('signal')) {
      logError([`Failed to ${status} ${appName}`, res.error], LogPrefix.Steam)
      return { status: 'error', error: res.error }
    }
    try {
      parseAureliaJson(res)
    } catch (error) {
      if (error instanceof AureliaError && error.aborted) {
        return { status: 'abort' }
      }
      logError(
        [`Failed to ${status} ${appName}`, describeError(error)],
        LogPrefix.Steam
      )
      return { status: 'error', error: describeError(error) }
    }
    return { status: 'done' }
  }

  async importGame(appName: string, path: string): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      return { stdout: '', stderr: 'Steam import disabled' }
    }
    const importLogWriter = await createGameLogWriter(
      appName,
      'steam',
      'import'
    )
    const res = await libraryManagerMap['steam'].runRunnerCommand(
      ['import', appName, path, '--json'],
      { abortId: appName, logWriters: [importLogWriter] }
    )
    if (res.error) {
      logError(['Failed to import', appName, res.error], LogPrefix.Steam)
      return { stdout: '', stderr: res.error }
    }
    await libraryManagerMap['steam'].refresh()
    sendFrontendMessage('refreshLibrary', 'steam')
    return { stdout: res.stdout, stderr: res.stderr }
  }

  onInstallOrUpdateOutput(): void {
    // Progress is forwarded straight to the download manager by the shared
    // Aurelia progress handler, so there is nothing to do here.
    return
  }

  async install(
    appName: string,
    { platformToInstall }: InstallArgs
  ): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot install ${appName}`,
        LogPrefix.Steam
      )
      return { status: 'error', error: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo(appName)
    logInfo(`Installing ${gameInfo.title} (${appName})`, LogPrefix.Steam)

    const platformArg = aureliaPlatform(platformToInstall)
    const commandParts = [
      'install',
      appName,
      ...(platformArg ? ['-p', platformArg] : [])
    ]

    const result = await this.runStreamingCommand(
      appName,
      commandParts,
      'installing',
      'install'
    )

    if (result.status === 'done') {
      void this.addShortcuts(appName)
      libraryManagerMap['steam'].installState(appName, true)
      await libraryManagerMap['steam'].refresh()
      logInfo(
        `Steam finished installing ${gameInfo.title} (${appName})`,
        LogPrefix.Steam
      )
    }
    return result
  }

  isNative(): boolean {
    // Steam games are launched through Aurelia, which handles compatibility
    // (Proton) on its own, so from Heroic's point of view they always run
    // "natively".
    return true
  }

  async addShortcuts(appName: string, fromMenu?: boolean): Promise<void> {
    return addShortcutsUtil(this.getGameInfo(appName), fromMenu)
  }

  async removeShortcuts(appName: string): Promise<void> {
    return removeShortcutsUtil(this.getGameInfo(appName))
  }

  /**
   * Runs a Steam Cloud sync for `appName` around a launch via `aurelia cloud
   * sync`. We force `--down` before the game starts (pull the latest cloud saves
   * locally) and `--up` after it exits (push whatever it wrote). Failures are
   * logged but deliberately swallowed: a cloud-sync hiccup must never block the
   * game from launching or leave Heroic hanging after it closes.
   */
  private async syncCloudSaves(
    appName: string,
    direction: 'up' | 'down',
    logWriter: LogWriter
  ): Promise<void> {
    const action = direction === 'down' ? 'download' : 'upload'
    try {
      await logWriter.logInfo(`Steam Cloud sync (${action})`)
      await runAurelia(['cloud', 'sync', appName, `--${direction}`], {
        abortId: `${appName}-cloud-${direction}`,
        logWriters: [logWriter]
      })
    } catch (error) {
      logWarning(
        [
          `Failed to ${action} Steam Cloud saves for ${appName}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
    }
  }

  async launch(appName: string, logWriter: LogWriter): Promise<boolean> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot launch ${appName}`,
        LogPrefix.Steam
      )
      return false
    }

    const gameInfo = this.getGameInfo(appName)
    if (!gameInfo.is_installed) {
      logError(
        `Cannot launch ${appName}, game is not installed`,
        LogPrefix.Steam
      )
      return false
    }

    logInfo(
      `Launching ${gameInfo.title} (${appName}) through Aurelia`,
      LogPrefix.Steam
    )
    await logWriter.logInfo(`Launching ${gameInfo.title} through Aurelia`)

    // Make any queued DLC enable/disable permanent (it needs a Steam restart),
    // then launch. Doing it here means the user isn't interrupted at toggle time.
    await this.applyPendingDlcChanges()

    // Pull the latest Steam Cloud saves before the game starts so it opens with
    // whatever was last played on another device.
    await this.syncCloudSaves(appName, 'down', logWriter)

    sendGameStatusUpdate({ appName, runner: 'steam', status: 'playing' })

    // Aurelia auto-detects the runner (native/Proton) itself; `play` blocks
    // until the game exits, keeping Heroic's "playing" status accurate.
    const res = await libraryManagerMap['steam'].runRunnerCommand(
      ['play', appName, '--json'],
      { abortId: appName, logWriters: [logWriter] }
    )

    if (res.error && !res.error.includes('signal')) {
      logError(
        [`Failed to launch ${appName} through Aurelia`, res.error],
        LogPrefix.Steam
      )
      return false
    }

    // The game has exited (or was stopped by the user): push any saves it wrote
    // back up to Steam Cloud.
    await this.syncCloudSaves(appName, 'up', logWriter)

    logInfo(`${gameInfo.title} (${appName}) has stopped`, LogPrefix.Steam)
    return true
  }

  async moveInstall(
    appName: string,
    newInstallPath: string
  ): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      return { status: 'error', error: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo(appName)
    logInfo(
      `Moving ${gameInfo.title} (${appName}) to ${newInstallPath}`,
      LogPrefix.Steam
    )

    const result = await this.runStreamingCommand(
      appName,
      ['move', appName, newInstallPath],
      'moving',
      'update'
    )

    if (result.status === 'done') {
      await libraryManagerMap['steam'].refresh()
      sendFrontendMessage('refreshLibrary', 'steam')
    }
    return result
  }

  async repair(appName: string): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      return { stdout: '', stderr: 'Steam import disabled' }
    }
    const result = await this.runStreamingCommand(
      appName,
      ['verify', appName],
      'repairing',
      'repair'
    )
    return {
      stdout: result.status === 'done' ? 'verified' : '',
      stderr: result.error ?? ''
    }
  }

  async syncSaves(appName: string, arg: string, path: string): Promise<string> {
    if (!isSteamImportEnabled()) {
      return ''
    }
    // `arg` carries the desired direction (e.g. an upload/download hint); Aurelia
    // performs a bidirectional Steam Cloud sync by default, with optional
    // --up/--down to force one direction.
    const directionFlag = /upload/i.test(arg)
      ? ['--up']
      : /download/i.test(arg)
        ? ['--down']
        : []
    const pathArg = path ? ['--path', path] : []
    try {
      await runAurelia(['cloud', 'sync', appName, ...directionFlag, ...pathArg])
      return 'Steam Cloud sync finished'
    } catch (error) {
      logError(
        [
          `Failed to sync Steam Cloud saves for ${appName}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
      return `${describeError(error)}`
    }
  }

  async uninstall({ appName, deleteFiles }: RemoveArgs): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot uninstall ${appName}`,
        LogPrefix.Steam
      )
      return { stdout: '', stderr: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo(appName)
    logInfo(`Uninstalling ${gameInfo.title} (${appName})`, LogPrefix.Steam)

    try {
      // `deleteFiles` here means "also remove the Wine prefix/compat data".
      await runAurelia([
        'uninstall',
        appName,
        ...(deleteFiles ? ['--delete-prefix'] : [])
      ])
    } catch (error) {
      logError(
        [`Failed to uninstall ${appName}`, describeError(error)],
        LogPrefix.Steam
      )
      return { stdout: '', stderr: describeError(error) }
    }

    await removeShortcutsUtil(gameInfo)
    libraryManagerMap['steam'].installState(appName, false)
    await libraryManagerMap['steam'].refresh()

    logInfo(
      `Steam finished uninstalling ${gameInfo.title} (${appName})`,
      LogPrefix.Steam
    )
    return { stdout: '', stderr: '' }
  }

  async update(appName: string): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      return { status: 'error', error: 'Steam import disabled' }
    }
    const result = await this.runStreamingCommand(
      appName,
      ['update', appName],
      'updating',
      'update'
    )
    if (result.status === 'done') {
      await libraryManagerMap['steam'].refresh()
    }
    return result
  }

  async forceUninstall(appName: string): Promise<void> {
    const gameInfo = this.getGameInfo(appName)
    await removeShortcutsUtil(gameInfo)
    libraryManagerMap['steam'].installState(appName, false)
    sendFrontendMessage('refreshLibrary', 'steam')
  }

  async stop(appName: string): Promise<void> {
    if (!isSteamImportEnabled()) {
      return
    }
    const gameInfo = this.getGameInfo(appName)
    logInfo(`Stopping ${gameInfo.title} (${appName})`, LogPrefix.Steam)
    try {
      await runAurelia(['stop', appName])
    } catch (error) {
      logWarning(
        [`Failed to stop ${appName}`, describeError(error)],
        LogPrefix.Steam
      )
    }
  }

  async isGameAvailable(appName: string): Promise<boolean> {
    if (!isSteamImportEnabled()) {
      return false
    }

    // Heroic only manages games in its own Steam library; ignore unknown ids.
    const info = libraryManagerMap['steam'].getGameInfo(appName)
    if (!info) {
      return false
    }

    try {
      // `aurelia available <id>` is a local, offline check: it reads only the
      // on-disk Steam files and never logs on to Steam, so it's safe to call
      // freely per game (no caching needed) without hitting Steam's rate limit.
      const result = await runAurelia<{
        app_id?: number
        available?: boolean
        install_path?: string | null
      }>(['available', appName])
      return Boolean(result.available)
    } catch (error) {
      logWarning(
        [`Unable to check availability for ${appName}`, describeError(error)],
        LogPrefix.Steam
      )
      // Fall back to a local presence check so a failed lookup never reports an
      // installed game as unavailable.
      return Boolean(
        info.is_installed &&
        info.install?.install_path &&
        existsSync(info.install.install_path)
      )
    }
  }
}
