import { GameConfig } from '../../game_config'
import { ExtraInfo, GameInfo, GameSettings, ExecResult } from 'common/types'
import { existsSync } from 'graceful-fs'
import { spawnSync } from 'child_process'
import { shell } from 'electron'
import { logError, logInfo, logWarning, LogPrefix } from 'backend/logger'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import {
  GameManager,
  InstallResult,
  RemoveArgs
} from 'common/types/game_manager'
import { axiosClient, sendGameStatusUpdate } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { isWindows } from 'backend/constants/environment'
import { GlobalConfig } from 'backend/config'
import { libraryManagerMap } from '..'
import { extraInfoStore } from './electronStores'
import {
  steamAppDetailsApiUrl,
  steamInstallUrl,
  steamRunGameUrl,
  steamStoreAppUrl,
  steamUninstallUrl
} from './constants'

import type LogWriter from 'backend/logger/log_writer'

// How often to poll for the launched game's process while it is running.
const STEAM_PROCESS_POLL_INTERVAL_MS = 5000
// How long to wait for the game's process to appear after asking Steam to
// launch it before giving up (Steam itself might need to start first).
const STEAM_PROCESS_STARTUP_TIMEOUT_MS = 120000

// How often to poll for an install's progress (the game's `appmanifest`).
const STEAM_INSTALL_POLL_INTERVAL_MS = 5000
// How long to wait for Steam to start the download (i.e. for the manifest to
// appear) before assuming the user cancelled the Steam install dialog.
const STEAM_INSTALL_START_TIMEOUT_MS = 15 * 60 * 1000

// How often to poll for an uninstall to complete (the game's `appmanifest`
// being removed by Steam).
const STEAM_UNINSTALL_POLL_INTERVAL_MS = 3000
// How long to wait for Steam to remove the game before assuming the user
// cancelled the Steam uninstall dialog.
const STEAM_UNINSTALL_TIMEOUT_MS = 15 * 60 * 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Checks whether any process is currently running from inside the given
 * install directory. Steam launches games as its own child processes (outside
 * of Heroic), so we detect the running game by matching process executables
 * against the game's install path.
 */
function isSteamGameRunning(installPath: string): boolean {
  try {
    if (isWindows) {
      const escaped = installPath.replace(/'/g, "''")
      const script = `@(Get-CimInstance Win32_Process | Where-Object { $_.Path -and $_.Path.StartsWith('${escaped}\\') }).Count`
      const ret = spawnSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        script
      ])
      const count = parseInt(ret.stdout?.toString().trim() || '0', 10)
      return Number.isFinite(count) && count > 0
    }
    const ret = spawnSync('pgrep', ['-f', '--', installPath])
    return ret.status === 0
  } catch {
    return false
  }
}

/**
 * Terminates any process running from inside the given install directory.
 */
function killSteamGameProcesses(installPath: string): void {
  if (isWindows) {
    const escaped = installPath.replace(/'/g, "''")
    const script = `Get-CimInstance Win32_Process | Where-Object { $_.Path -and $_.Path.StartsWith('${escaped}\\') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
    spawnSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      script
    ])
  } else {
    spawnSync('pkill', ['-f', '--', installPath])
  }
}

function isSteamImportEnabled(): boolean {
  return !!GlobalConfig.get().getSettings().experimentalFeatures?.steamImport
}

interface SteamRequirementsBlock {
  minimum?: string
  recommended?: string
}

interface SteamAppDetailsData {
  short_description?: string
  about_the_game?: string
  detailed_description?: string
  website?: string
  release_date?: { coming_soon?: boolean; date?: string }
  genres?: { id: string; description: string }[]
  pc_requirements?: SteamRequirementsBlock | []
  mac_requirements?: SteamRequirementsBlock | []
  linux_requirements?: SteamRequirementsBlock | []
}

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean
    data?: SteamAppDetailsData
  }
}

/**
 * Strips HTML tags/entities from the Steam storefront strings so they render
 * as plain text in Heroic's UI.
 */
function stripHtml(input?: string): string {
  if (!input) return ''
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|ul|ol|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function requirementsBlock(
  block: SteamRequirementsBlock | [] | undefined
): SteamRequirementsBlock {
  if (!block || Array.isArray(block)) return {}
  return block
}

/**
 * Steam game manager.
 *
 * NOTE: Step 1 only implements authentication. Installing, launching and
 * managing Steam games is handled in a later step, so the operational methods
 * here are intentionally stubbed out.
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

    try {
      const { data } = await axiosClient.get<SteamAppDetailsResponse>(
        steamAppDetailsApiUrl,
        {
          params: { appids: appName, l: 'english' }
        }
      )

      const entry = data?.[appName]
      if (!entry?.success || !entry.data) {
        return empty
      }

      const details = entry.data
      const pc = requirementsBlock(details.pc_requirements)
      const mac = requirementsBlock(details.mac_requirements)
      const linux = requirementsBlock(details.linux_requirements)

      const reqs: ExtraInfo['reqs'] = []
      const pushReqs = (title: string, block: SteamRequirementsBlock) => {
        if (block.minimum || block.recommended) {
          reqs.push({
            title,
            minimum: stripHtml(block.minimum),
            recommended: stripHtml(block.recommended)
          })
        }
      }
      pushReqs('Windows', pc)
      pushReqs('macOS', mac)
      pushReqs('Linux', linux)

      const extraInfo: ExtraInfo = {
        about: {
          description: stripHtml(
            details.about_the_game || details.detailed_description
          ),
          shortDescription: stripHtml(details.short_description)
        },
        reqs,
        releaseDate: details.release_date?.date || undefined,
        storeUrl: details.website || `${steamStoreAppUrl}/${appName}`,
        changelog: undefined,
        genres: details.genres?.map((genre) => genre.description) ?? []
      }

      extraInfoStore.set(appName, extraInfo)
      return extraInfo
    } catch (error) {
      logError(
        [`Unable to get Steam store info for ${appName}`, error],
        LogPrefix.Steam
      )
      return empty
    }
  }

  async importGame(appName: string): Promise<ExecResult> {
    logWarning(`Import not implemented for Steam: ${appName}`, LogPrefix.Steam)
    return { stdout: '', stderr: 'Import not implemented' }
  }

  onInstallOrUpdateOutput(): void {
    return
  }

  async install(appName: string): Promise<InstallResult> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot install ${appName}`,
        LogPrefix.Steam
      )
      return { status: 'error', error: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo(appName)

    // If Steam already has the game fully installed, just sync Heroic's view.
    const existing = await libraryManagerMap['steam'].findInstalledGame(appName)
    if (existing?.fullyInstalled) {
      await libraryManagerMap['steam'].refresh()
      return { status: 'done' }
    }

    logInfo(
      `Asking Steam to install ${gameInfo.title} (${appName})`,
      LogPrefix.Steam
    )

    try {
      await shell.openExternal(`${steamInstallUrl}/${appName}`)
    } catch (error) {
      logError(
        [`Failed to ask Steam to install ${appName}`, error],
        LogPrefix.Steam
      )
      return { status: 'error', error: `${error}` }
    }

    // Steam downloads the game in its own client. Poll the game's appmanifest
    // until Steam reports it fully installed (or the user cancels, in which
    // case the manifest never appears within the startup window).
    let waitedForStart = 0
    let started = false
    for (;;) {
      await delay(STEAM_INSTALL_POLL_INTERVAL_MS)

      const state = await libraryManagerMap['steam'].findInstalledGame(appName)

      if (state) {
        // Steam has begun the download; keep waiting until it finishes.
        started = true
        if (state.fullyInstalled) {
          break
        }
      } else if (!started) {
        waitedForStart += STEAM_INSTALL_POLL_INTERVAL_MS
        if (waitedForStart >= STEAM_INSTALL_START_TIMEOUT_MS) {
          logWarning(
            `Steam did not start installing ${appName}; assuming it was cancelled`,
            LogPrefix.Steam
          )
          return {
            status: 'error',
            error: 'Steam installation was not started'
          }
        }
      } else {
        // The manifest disappeared after the download had started, meaning the
        // install was cancelled in Steam.
        logWarning(
          `Steam installation of ${appName} appears to have been cancelled`,
          LogPrefix.Steam
        )
        return { status: 'error', error: 'Steam installation was cancelled' }
      }
    }

    logInfo(
      `Steam finished installing ${gameInfo.title} (${appName})`,
      LogPrefix.Steam
    )

    // Re-scan so the game now shows up as installed in Heroic.
    await libraryManagerMap['steam'].refresh()

    return { status: 'done' }
  }

  isNative(): boolean {
    // Steam games are always launched through the Steam client itself, which
    // handles compatibility (Proton) on its own. Heroic never wraps them in
    // Wine, so from Heroic's point of view they always run "natively".
    return true
  }

  async addShortcuts(appName: string, fromMenu?: boolean): Promise<void> {
    return addShortcutsUtil(this.getGameInfo(appName), fromMenu)
  }

  async removeShortcuts(appName: string): Promise<void> {
    return removeShortcutsUtil(this.getGameInfo(appName))
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
    const installPath = gameInfo.install?.install_path

    if (!gameInfo.is_installed || !installPath) {
      logError(
        `Cannot launch ${appName}, game is not installed`,
        LogPrefix.Steam
      )
      return false
    }

    if (!existsSync(installPath)) {
      logError(
        `Cannot launch ${appName}, install path ${installPath} does not exist`,
        LogPrefix.Steam
      )
      return false
    }

    logInfo(
      `Launching ${gameInfo.title} (${appName}) through Steam`,
      LogPrefix.Steam
    )
    await logWriter.logInfo(`Launching ${gameInfo.title} through Steam`)

    sendGameStatusUpdate({ appName, runner: 'steam', status: 'playing' })

    try {
      await shell.openExternal(`${steamRunGameUrl}/${appName}`)
    } catch (error) {
      logError(
        [`Failed to ask Steam to launch ${appName}`, error],
        LogPrefix.Steam
      )
      return false
    }

    // Steam runs the game as its own (detached) process, so block here until
    // the game's process appears and then exits. This keeps Heroic's "playing"
    // status accurate and lets play time be recorded by the launcher.
    let started = false
    let waited = 0
    let running = true
    do {
      await delay(STEAM_PROCESS_POLL_INTERVAL_MS)
      running = isSteamGameRunning(installPath)
      if (running) {
        started = true
      } else if (!started) {
        waited += STEAM_PROCESS_POLL_INTERVAL_MS
      }
    } while (running || (!started && waited < STEAM_PROCESS_STARTUP_TIMEOUT_MS))

    if (!started) {
      logWarning(
        `Did not detect ${gameInfo.title} (${appName}) starting; it may have been launched by Steam in another way`,
        LogPrefix.Steam
      )
    } else {
      logInfo(`${gameInfo.title} (${appName}) has stopped`, LogPrefix.Steam)
    }

    return true
  }

  async moveInstall(): Promise<InstallResult> {
    return { status: 'error', error: 'Move not implemented' }
  }

  async repair(): Promise<ExecResult> {
    return { stdout: '', stderr: 'Repair not implemented' }
  }

  async syncSaves(): Promise<string> {
    return ''
  }

  async uninstall({ appName }: RemoveArgs): Promise<ExecResult> {
    if (!isSteamImportEnabled()) {
      logWarning(
        `Steam import is disabled, cannot uninstall ${appName}`,
        LogPrefix.Steam
      )
      return { stdout: '', stderr: 'Steam import disabled' }
    }

    const gameInfo = this.getGameInfo(appName)

    // If the game is already gone from Steam, just sync Heroic's view.
    const existing = await libraryManagerMap['steam'].findInstalledGame(appName)
    if (!existing) {
      libraryManagerMap['steam'].installState(appName, false)
      await removeShortcutsUtil(gameInfo)
      sendFrontendMessage('refreshLibrary', 'steam')
      return { stdout: '', stderr: '' }
    }

    logInfo(
      `Asking Steam to uninstall ${gameInfo.title} (${appName})`,
      LogPrefix.Steam
    )

    try {
      await shell.openExternal(`${steamUninstallUrl}/${appName}`)
    } catch (error) {
      logError(
        [`Failed to ask Steam to uninstall ${appName}`, error],
        LogPrefix.Steam
      )
      return { stdout: '', stderr: `${error}` }
    }

    // Steam removes the game in its own client once the user confirms. Poll the
    // game's appmanifest until Steam has deleted it (or the user cancels, in
    // which case the manifest is still present after the timeout).
    let waited = 0
    for (;;) {
      await delay(STEAM_UNINSTALL_POLL_INTERVAL_MS)

      const state = await libraryManagerMap['steam'].findInstalledGame(appName)
      if (!state) {
        break
      }

      waited += STEAM_UNINSTALL_POLL_INTERVAL_MS
      if (waited >= STEAM_UNINSTALL_TIMEOUT_MS) {
        logWarning(
          `Steam did not uninstall ${appName}; assuming it was cancelled`,
          LogPrefix.Steam
        )
        return { stdout: '', stderr: 'Steam uninstall was cancelled' }
      }
    }

    await removeShortcutsUtil(gameInfo)
    libraryManagerMap['steam'].installState(appName, false)

    logInfo(
      `Steam finished uninstalling ${gameInfo.title} (${appName})`,
      LogPrefix.Steam
    )

    // Re-scan so the game now shows up as not installed in Heroic.
    await libraryManagerMap['steam'].refresh()

    return { stdout: '', stderr: '' }
  }

  async update(): Promise<InstallResult> {
    return { status: 'error', error: 'Update not implemented' }
  }

  async forceUninstall(appName: string): Promise<void> {
    const gameInfo = this.getGameInfo(appName)
    await removeShortcutsUtil(gameInfo)
    libraryManagerMap['steam'].installState(appName, false)
    sendFrontendMessage('refreshLibrary', 'steam')
  }

  async stop(appName: string): Promise<void> {
    const gameInfo = this.getGameInfo(appName)
    const installPath = gameInfo.install?.install_path

    if (!installPath) {
      logWarning(
        `Cannot stop ${appName}, no install path is known`,
        LogPrefix.Steam
      )
      return
    }

    logInfo(`Stopping ${gameInfo.title} (${appName})`, LogPrefix.Steam)
    killSteamGameProcesses(installPath)
  }

  async isGameAvailable(appName: string): Promise<boolean> {
    const info = this.getGameInfo(appName)
    return Boolean(
      info?.is_installed &&
      info.install?.install_path &&
      existsSync(info.install.install_path)
    )
  }
}
