import { GameConfig } from '../../game_config'
import { ExtraInfo, GameInfo, GameSettings, ExecResult } from 'common/types'
import { existsSync } from 'graceful-fs'
import { logError, logWarning, LogPrefix } from 'backend/logger'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { GameManager, InstallResult } from 'common/types/game_manager'
import { libraryManagerMap } from '..'

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

  async getExtraInfo(): Promise<ExtraInfo> {
    return {
      about: { description: '', shortDescription: '' },
      reqs: [],
      releaseDate: undefined,
      storeUrl: undefined,
      changelog: undefined
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
