import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  LaunchOption
} from 'common/types'
import { libraryStore } from './electronStores'
import { GameConfig } from '../../game_config'
import { killPattern, sendGameStatusUpdate, shutdownWine } from '../../utils'
import { logInfo, LogPrefix, logWarning } from 'backend/logger'
import { dirname } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import i18next from 'i18next'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { notify } from '../../dialog/dialog'
import { launchGame } from 'backend/storeManagers/storeManagerCommon/games'
import { Game, InstallResult, RemoveArgs } from 'common/types/game_manager'
import { removePrefix } from 'backend/utils/uninstaller'
import { removeRecentGame } from 'backend/recent_games/recent_games'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'

import type LogWriter from 'backend/logger/log_writer'

export default class SideloadGame implements Game {
  private readonly id: string

  constructor(id: string) {
    this.id = id
  }

  getGameInfo(): GameInfo {
    const store = libraryStore.get('games', [])
    const info = store.find((app) => app.app_name === this.id)
    if (!info) {
      // @ts-expect-error TODO: As with LegendaryGame and GOGGame, handle this properly
      return {}
    }
    return info
  }

  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.id).config ||
      (await GameConfig.get(this.id).getSettings())
    )
  }

  async addShortcuts(fromMenu?: boolean): Promise<void> {
    return addShortcutsUtil(this.getGameInfo(), fromMenu)
  }

  async removeShortcuts(): Promise<void> {
    return removeShortcutsUtil(this.getGameInfo())
  }

  async isGameAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const { install } = this.getGameInfo()

      if (install && install.platform === 'Browser') {
        resolve(true)
      }

      if (install && install.executable) {
        resolve(existsSync(install.executable))
      }
    })
  }

  async launch(
    logWriter: LogWriter,
    launchArguments?: LaunchOption,
    args: string[] = []
  ): Promise<boolean> {
    return launchGame(this.id, logWriter, this.getGameInfo(), 'sideload', args)
  }

  async stop(): Promise<void> {
    const {
      install: { executable = undefined }
    } = this.getGameInfo()

    if (executable) {
      const split = executable.split('/')
      const exe = split[split.length - 1]
      killPattern(exe)

      if (!this.isNative()) {
        const gameSettings = await this.getSettings()
        shutdownWine(gameSettings)
      }
    }
  }

  async uninstall({
    shouldRemovePrefix,
    deleteFiles = false
  }: RemoveArgs): Promise<ExecResult> {
    sendGameStatusUpdate({
      appName: this.id,
      runner: 'sideload',
      status: 'uninstalling'
    })

    const old = libraryStore.get('games', [])
    const current = old.filter((a: GameInfo) => a.app_name !== this.id)

    const gameInfo = this.getGameInfo()
    const {
      title,
      install: { executable }
    } = gameInfo

    if (shouldRemovePrefix) {
      removePrefix(this.id, 'sideload')
    }
    libraryStore.set('games', current)

    if (deleteFiles && executable !== undefined) {
      rmSync(dirname(executable), { recursive: true })
    }

    notify({ title, body: i18next.t('notify.uninstalled') })

    removeShortcutsUtil(gameInfo)
    removeRecentGame(this.id)
    removeNonSteamGame({ gameInfo })

    sendGameStatusUpdate({
      appName: this.id,
      runner: 'sideload',
      status: 'done'
    })

    logInfo('finished uninstalling', LogPrefix.Backend)
    return { stderr: '', stdout: '' }
  }

  isNative(): boolean {
    const {
      install: { platform }
    } = this.getGameInfo()
    if (platform) {
      if (platform === 'Browser') {
        return true
      }

      if (isWindows) {
        return true
      }

      if (isMac && platform === 'Mac') {
        return true
      }

      // small hack, but needs to fix the typings
      const plat = platform.toLowerCase()
      if (isLinux && plat === 'linux') {
        return true
      }
    }

    return false
  }

  async getExtraInfo(): Promise<ExtraInfo> {
    logWarning(
      `getExtraInfo not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
    return {
      about: {
        description: '',
        shortDescription: ''
      },
      reqs: [],
      storeUrl: ''
    }
  }

  onInstallOrUpdateOutput() {
    logWarning(
      `onInstallOrUpdateOutput not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
  }

  async moveInstall(): Promise<InstallResult> {
    logWarning(
      `moveInstall not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
    return { status: 'error' }
  }

  async repair(): Promise<ExecResult> {
    logWarning(
      `repair not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
    return { stderr: '', stdout: '' }
  }

  async syncSaves(): Promise<string> {
    logWarning(
      `syncSaves not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
    return ''
  }

  async forceUninstall(): Promise<void> {
    logWarning(
      `forceUninstall not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
  }

  async install(): Promise<InstallResult> {
    logWarning(
      `install not implemented on Sideload Game Manager. called for ID = ${this.id}`
    )
    return { status: 'error' }
  }

  async importGame(): Promise<ExecResult> {
    return { stderr: '', stdout: '' }
  }

  async update(): Promise<{ status: 'done' | 'error' }> {
    return { status: 'error' }
  }
}
