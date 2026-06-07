import { GameConfig } from '../../game_config'
import { ExtraInfo, GameInfo, GameSettings, ExecResult } from 'common/types'
import { existsSync } from 'graceful-fs'
import { logError, logWarning, LogPrefix } from 'backend/logger'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { GameManager, InstallResult } from 'common/types/game_manager'
import { axiosClient } from 'backend/utils'
import { libraryManagerMap } from '..'
import { extraInfoStore } from './electronStores'
import { steamAppDetailsApiUrl, steamStoreAppUrl } from './constants'

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
    logWarning(`Install not implemented for Steam: ${appName}`, LogPrefix.Steam)
    return { status: 'error', error: 'Install not implemented' }
  }

  isNative(appName: string): boolean {
    const gameInfo = this.getGameInfo(appName)
    return Boolean(gameInfo.is_linux_native || gameInfo.is_mac_native)
  }

  async addShortcuts(appName: string, fromMenu?: boolean): Promise<void> {
    return addShortcutsUtil(this.getGameInfo(appName), fromMenu)
  }

  async removeShortcuts(appName: string): Promise<void> {
    return removeShortcutsUtil(this.getGameInfo(appName))
  }

  async launch(): Promise<boolean> {
    return false
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

  async uninstall(): Promise<ExecResult> {
    return { stdout: '', stderr: 'Uninstall not implemented' }
  }

  async update(): Promise<InstallResult> {
    return { status: 'error', error: 'Update not implemented' }
  }

  async forceUninstall(): Promise<void> {
    return
  }

  async stop(): Promise<void> {
    return
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
