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
  Status
} from 'common/types'
import { REQS_OTHER_TITLE } from 'common/utils'
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
import { Game, InstallResult, RemoveArgs } from 'common/types/game_manager'
import { sendGameStatusUpdate } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { GlobalConfig } from 'backend/config'
import { libraryManagerMap } from '..'
import { configStore, extraInfoStore } from './electronStores'
import {
  runAurelia,
  fetchAureliaInfo,
  parseAureliaJson,
  makeAureliaProgressHandler,
  AureliaError
} from './aurelia'
import type { AureliaAchievementsResponse } from './aurelia_types'

import type LogWriter from 'backend/logger/log_writer'

function isSteamImportEnabled(): boolean {
  return !!GlobalConfig.get().getSettings().experimentalFeatures?.steamImport
}

function describeError(error: unknown): string {
  return error instanceof AureliaError ? error.message : String(error)
}

function aureliaPlatform(platform: InstallPlatform): string | undefined {
  const lc = String(platform).toLowerCase()
  if (lc.startsWith('win')) return 'windows'
  if (lc.startsWith('lin')) return 'linux'
  return undefined
}

// Maps Aurelia's store platform strings
function toInstallPlatforms(platforms?: string[]): InstallPlatform[] {
  if (!platforms) return []
  const mapped = platforms
    .map((p): InstallPlatform | undefined => {
      const lc = p.toLowerCase()
      if (lc.startsWith('win')) return 'Windows'
      if (lc.startsWith('mac') || lc === 'osx') return 'Mac'
      if (lc.startsWith('lin') || lc.startsWith('steam')) return 'linux'
      return undefined
    })
    .filter((p): p is InstallPlatform => p !== undefined)
  return Array.from(new Set(mapped))
}

// Locales whose Steam name isn't derivable from the primary subtag alone.
const STEAM_LANG_EXACT: Record<string, string> = {
  'pt-br': 'brazilian',
  'zh-cn': 'schinese',
  'zh-hans': 'schinese',
  'zh-sg': 'schinese',
  'zh-tw': 'tchinese',
  'zh-hk': 'tchinese',
  'zh-hant': 'tchinese',
  'es-419': 'latam',
  'es-mx': 'latam'
}

const STEAM_LANG_BY_PRIMARY: Record<string, string> = {
  ar: 'arabic',
  bg: 'bulgarian',
  cs: 'czech',
  da: 'danish',
  nl: 'dutch',
  en: 'english',
  fi: 'finnish',
  fr: 'french',
  de: 'german',
  el: 'greek',
  hu: 'hungarian',
  id: 'indonesian',
  it: 'italian',
  ja: 'japanese',
  ko: 'koreana',
  no: 'norwegian',
  pl: 'polish',
  pt: 'portuguese',
  ro: 'romanian',
  ru: 'russian',
  es: 'spanish',
  sv: 'swedish',
  th: 'thai',
  tr: 'turkish',
  uk: 'ukrainian',
  vi: 'vietnamese',
  zh: 'schinese'
}

function toSteamApiLanguage(lang: string): string {
  const lc = lang.toLowerCase().replace('_', '-')
  if (STEAM_LANG_EXACT[lc]) return STEAM_LANG_EXACT[lc]
  return STEAM_LANG_BY_PRIMARY[lc.split('-')[0]] ?? 'english'
}

/**
 * Strips Steam's store-description markup
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
 * `label -> value` pair
 */
function splitRequirement(line: string): [string, string] {
  const idx = line.indexOf(':')
  if (idx === -1) return [REQS_OTHER_TITLE, line.trim()]
  return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
}

/**
 * Builds `Reqs[]` table
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
 */
export default class SteamGame implements Game {
  private readonly id: string

  constructor(id: string) {
    this.id = id
  }

  getGameInfo(): GameInfo {
    const info = libraryManagerMap['steam'].getGameInfo(this.id)
    if (!info) {
      logError(
        [
          'Could not get game info for',
          `${this.id},`,
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

  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.id).config ||
      (await GameConfig.get(this.id).getSettings())
    )
  }

  async getExtraInfo(lang = 'en-US'): Promise<ExtraInfo> {
    const steamLang = toSteamApiLanguage(lang)
    const cacheKey = `${this.id}-${steamLang}`
    const cached = extraInfoStore.get(cacheKey)
    if (cached) {
      return cached
    }

    const empty: ExtraInfo = {
      about: { description: '', shortDescription: '' },
      reqs: [],
      releaseDate: undefined,
      storeUrl: libraryManagerMap['steam'].getGameInfo(this.id)?.store_url,
      changelog: undefined,
      genres: []
    }

    if (!isSteamImportEnabled()) {
      return empty
    }

    if (!libraryManagerMap['steam'].getGameInfo(this.id)) {
      return empty
    }

    try {
      const [details] = await fetchAureliaInfo([this.id], {
        extended: true,
        language: steamLang
      })
      if (!details) {
        return empty
      }

      // `--extended` populate rich fields
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
        storeUrl: ext.website || details.store_url,
        changelog: undefined,
        genres: ext.genres ?? [],
        // Artwork URLs are baked into Aurelia's response.
        background: assets.hero || assets.background,
        cover: assets.header,
        score:
          typeof ext.metacritic === 'number'
            ? String(ext.metacritic)
            : undefined,
        platforms: toInstallPlatforms(details.platforms)
      }

      extraInfoStore.set(cacheKey, extraInfo)
      return extraInfo
    } catch (error) {
      logError(
        [`Unable to get Steam store info for ${this.id}`, describeError(error)],
        LogPrefix.Steam
      )
      return empty
    }
  }

  async getAchievements(lang = 'en-US'): Promise<GameAchievement[]> {
    if (!isSteamImportEnabled()) {
      return []
    }
    try {
      const res = await runAurelia<AureliaAchievementsResponse>([
        'achievements',
        this.id,
        '-l',
        toSteamApiLanguage(lang)
      ])
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
          `Unable to get Steam achievements for ${this.id}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
      return []
    }
  }

  /**
   * Enables or disables an owned DLC (`aurelia enable`/`disable <dlcAppId>`).
   * (see {@link applyPendingDlcChanges}) to make it permanent.
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
   * Makes any queued DLC enable/disable permanent by re-applying it with `--restart-steam`
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
   * streaming maintenance commands (install/update/verify)
   */
  private async runStreamingCommand(
    commandParts: string[],
    status: Status,
    logType: 'install' | 'update' | 'repair'
  ): Promise<InstallResult> {
    const logWriter = await createGameLogWriter(this.id, 'steam', logType)
    const res = await libraryManagerMap['steam'].runRunnerCommand(
      [...commandParts, '--json'],
      {
        abortId: this.id,
        logWriters: [logWriter],
        onOutput: makeAureliaProgressHandler(this.id, status),
        logMessagePrefix: `${status} ${this.id}`
      }
    )

    if (res.abort) {
      return { status: 'abort' }
    }
    if (res.error && !res.error.includes('signal')) {
      logError([`Failed to ${status} ${this.id}`, res.error], LogPrefix.Steam)
      return { status: 'error', error: res.error }
    }
    try {
      parseAureliaJson(res)
    } catch (error) {
      if (error instanceof AureliaError && error.aborted) {
        return { status: 'abort' }
      }
      logError(
        [`Failed to ${status} ${this.id}`, describeError(error)],
        LogPrefix.Steam
      )
      return { status: 'error', error: describeError(error) }
    }
    return { status: 'done' }
  }

  async importGame(path: string): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      return { stdout: '', stderr: 'Steam import disabled' }
    }
    const importLogWriter = await createGameLogWriter(
      this.id,
      'steam',
      'import'
    )
    const res = await libraryManagerMap['steam'].runRunnerCommand(
      ['import', this.id, path, '--json'],
      { abortId: this.id, logWriters: [importLogWriter] }
    )
    if (res.error) {
      logError(['Failed to import', this.id, res.error], LogPrefix.Steam)
      return { stdout: '', stderr: res.error }
    }
    await libraryManagerMap['steam'].refresh()
    sendFrontendMessage('refreshLibrary', 'steam')
    return { stdout: res.stdout, stderr: res.stderr }
  }

  // TODO: Add Aurelia Functionality here
  onInstallOrUpdateOutput(): void {
    return
  }

  async install({ platformToInstall }: InstallArgs): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot install ${this.id}`,
        LogPrefix.Steam
      )
      return { status: 'error', error: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo()
    logInfo(`Installing ${gameInfo.title} (${this.id})`, LogPrefix.Steam)

    const platformArg = aureliaPlatform(platformToInstall)
    const commandParts = [
      'install',
      this.id,
      ...(platformArg ? ['-p', platformArg] : [])
    ]

    const result = await this.runStreamingCommand(
      commandParts,
      'installing',
      'install'
    )

    if (result.status === 'done') {
      void this.addShortcuts()
      await libraryManagerMap['steam'].markInstalled(this.id)
      logInfo(
        `Steam finished installing ${gameInfo.title} (${this.id})`,
        LogPrefix.Steam
      )
    }
    return result
  }

  // TODO: Add Heroic handler to Aurelia
  // Currently Aurelia handles Proton layer
  isNative(): boolean {
    return true
  }

  async addShortcuts(fromMenu?: boolean): Promise<void> {
    return addShortcutsUtil(this, fromMenu)
  }

  async removeShortcuts(): Promise<void> {
    return removeShortcutsUtil(this)
  }

  /**
   * Runs a Steam Cloud sync
   */
  private async syncCloudSaves(
    direction: 'up' | 'down',
    logWriter: LogWriter
  ): Promise<void> {
    const action = direction === 'down' ? 'download' : 'upload'
    try {
      await logWriter.logInfo(`Steam Cloud sync (${action})`)
      await runAurelia(['cloud', 'sync', this.id, `--${direction}`], {
        abortId: `${this.id}-cloud-${direction}`,
        logWriters: [logWriter]
      })
    } catch (error) {
      logWarning(
        [
          `Failed to ${action} Steam Cloud saves for ${this.id}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
    }
  }

  async launch(logWriter: LogWriter): Promise<boolean> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot launch ${this.id}`,
        LogPrefix.Steam
      )
      return false
    }

    const gameInfo = this.getGameInfo()
    if (!gameInfo.is_installed) {
      logError(
        `Cannot launch ${this.id}, game is not installed`,
        LogPrefix.Steam
      )
      return false
    }

    logInfo(
      `Launching ${gameInfo.title} (${this.id}) through Aurelia`,
      LogPrefix.Steam
    )
    await logWriter.logInfo(`Launching ${gameInfo.title} through Aurelia`)

    await this.applyPendingDlcChanges()

    // Sync before starting a game
    await this.syncCloudSaves('down', logWriter)

    sendGameStatusUpdate({
      appName: this.id,
      runner: 'steam',
      status: 'playing'
    })

    const res = await libraryManagerMap['steam'].runRunnerCommand(
      ['play', this.id, '--json'],
      { abortId: this.id, logWriters: [logWriter] }
    )

    if (res.error && !res.error.includes('signal')) {
      logError(
        [`Failed to launch ${this.id} through Aurelia`, res.error],
        LogPrefix.Steam
      )
      return false
    }

    // Sync after game stopped
    await this.syncCloudSaves('up', logWriter)

    logInfo(`${gameInfo.title} (${this.id}) has stopped`, LogPrefix.Steam)
    return true
  }

  async moveInstall(newInstallPath: string): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      return { status: 'error', error: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo()
    logInfo(
      `Moving ${gameInfo.title} (${this.id}) to ${newInstallPath}`,
      LogPrefix.Steam
    )

    const result = await this.runStreamingCommand(
      ['move', this.id, newInstallPath],
      'moving',
      'update'
    )

    if (result.status === 'done') {
      await libraryManagerMap['steam'].refresh()
      sendFrontendMessage('refreshLibrary', 'steam')
    }
    return result
  }

  async repair(): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      return { stdout: '', stderr: 'Steam import disabled' }
    }
    const result = await this.runStreamingCommand(
      ['verify', this.id],
      'repairing',
      'repair'
    )
    return {
      stdout: result.status === 'done' ? 'verified' : '',
      stderr: result.error ?? ''
    }
  }

  async syncSaves(arg: string, path: string): Promise<string> {
    if (!isSteamImportEnabled()) {
      return ''
    }
    const directionFlag = /upload/i.test(arg)
      ? ['--up']
      : /download/i.test(arg)
        ? ['--down']
        : []
    const pathArg = path ? ['--path', path] : []
    try {
      await runAurelia(['cloud', 'sync', this.id, ...directionFlag, ...pathArg])
      return 'Steam Cloud sync finished'
    } catch (error) {
      logError(
        [
          `Failed to sync Steam Cloud saves for ${this.id}`,
          describeError(error)
        ],
        LogPrefix.Steam
      )
      return `${describeError(error)}`
    }
  }

  async uninstall({ deleteFiles }: RemoveArgs): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot uninstall ${this.id}`,
        LogPrefix.Steam
      )
      return { stdout: '', stderr: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo()
    logInfo(`Uninstalling ${gameInfo.title} (${this.id})`, LogPrefix.Steam)

    try {
      // `deleteFiles` here means "remove the Wine prefix/compat data".
      await runAurelia([
        'uninstall',
        this.id,
        ...(deleteFiles ? ['--delete-prefix'] : [])
      ])
    } catch (error) {
      logError(
        [`Failed to uninstall ${this.id}`, describeError(error)],
        LogPrefix.Steam
      )
      return { stdout: '', stderr: describeError(error) }
    }

    await removeShortcutsUtil(this)
    libraryManagerMap['steam'].installState(this.id, false)
    await libraryManagerMap['steam'].refresh()

    logInfo(
      `Steam finished uninstalling ${gameInfo.title} (${this.id})`,
      LogPrefix.Steam
    )
    return { stdout: '', stderr: '' }
  }

  async update(): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      return { status: 'error', error: 'Steam import disabled' }
    }
    const result = await this.runStreamingCommand(
      ['update', this.id],
      'updating',
      'update'
    )
    if (result.status === 'done') {
      await libraryManagerMap['steam'].refresh()
    }
    return result
  }

  async forceUninstall(): Promise<void> {
    await removeShortcutsUtil(this)
    libraryManagerMap['steam'].installState(this.id, false)
    sendFrontendMessage('refreshLibrary', 'steam')
  }

  async stop(): Promise<void> {
    if (!isSteamImportEnabled()) {
      return
    }
    const gameInfo = this.getGameInfo()
    logInfo(`Stopping ${gameInfo.title} (${this.id})`, LogPrefix.Steam)
    try {
      await runAurelia(['stop', this.id])
    } catch (error) {
      logWarning(
        [`Failed to stop ${this.id}`, describeError(error)],
        LogPrefix.Steam
      )
    }
  }

  async isGameAvailable(): Promise<boolean> {
    if (!isSteamImportEnabled()) {
      return false
    }

    // ignore unknown ids.
    const info = libraryManagerMap['steam'].getGameInfo(this.id)
    if (!info) {
      return false
    }

    try {
      const result = await runAurelia<{
        app_id?: number
        available?: boolean
        install_path?: string | null
      }>(['available', this.id])
      return Boolean(result.available)
    } catch (error) {
      logWarning(
        [`Unable to check availability for ${this.id}`, describeError(error)],
        LogPrefix.Steam
      )
      // Fall back to a local presence check
      return Boolean(
        info.is_installed &&
        info.install?.install_path &&
        existsSync(info.install.install_path)
      )
    }
  }
}
