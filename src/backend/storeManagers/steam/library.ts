import { ExecResult, GameInfo, InstallInfo, LaunchOption } from 'common/types'
import { LibraryManager } from 'common/types/game_manager'
import { logWarning, LogPrefix } from 'backend/logger'
import { libraryStore, installedGamesStore } from './electronStores'

/**
 * Steam library manager.
 *
 * NOTE: Step 1 only implements authentication. Fetching and managing the
 * actual Steam library is handled in a later step, so most methods here are
 * intentionally stubbed out and operate on the locally cached (currently
 * empty) library store.
 */
export default class SteamLibraryManager implements LibraryManager {
  async init(): Promise<void> {
    return
  }

  async refresh(): Promise<ExecResult | null> {
    // Library fetching is not implemented yet (Step 1: login only)
    return { stdout: '', stderr: '' }
  }

  getGameInfo(appName: string): GameInfo | undefined {
    const games = libraryStore.get('games', [])
    const game = games.find((value) => value.app_name === appName)
    if (!game) {
      return
    }
    const installedGames = installedGamesStore.get('installed', [])
    const installedInfo = installedGames.find(
      (value) => value.appName === appName
    )
    if (installedInfo) {
      game.is_installed = true
      game.install = installedInfo
    }
    return game
  }

  async getInstallInfo(): Promise<InstallInfo | undefined> {
    return undefined
  }

  async listUpdateableGames(): Promise<string[]> {
    return []
  }

  async changeGameInstallPath(): Promise<void> {
    return
  }

  changeVersionPinnedStatus(): void {
    logWarning(
      'changeVersionPinnedStatus not implemented on Steam Library Manager',
      LogPrefix.Steam
    )
  }

  installState(): void {
    logWarning(
      'installState not implemented on Steam Library Manager',
      LogPrefix.Steam
    )
  }

  getLaunchOptions(): LaunchOption[] {
    return []
  }
}
