import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
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
import { GOGCloudSavesLocation } from 'common/types/gog'
import {
  GameManager,
  InstallResult,
  RemoveArgs
} from 'common/types/game_manager'
import { removePrefix } from 'backend/utils/uninstaller'
import { removeRecentGame } from 'backend/recent_games/recent_games'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'

import type LogWriter from 'backend/logger/log_writer'

export default class SideloadGameManager implements GameManager {
getGameInfo(appName: string): GameInfo {
  const store = libraryStore.get('games', [])
  const info = store.find((app) => app.app_name === appName)
  if (!info) {
    // @ts-expect-error TODO: As with LegendaryGame and GOGGame, handle this properly
    return {}
  }
  return info
}

async getSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

async addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  return addShortcutsUtil(this.getGameInfo(appName), fromMenu)
}

async removeShortcuts(appName: string): Promise<void> {
  return removeShortcutsUtil(this.getGameInfo(appName))
}

async isGameAvailable(appName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { install } = this.getGameInfo(appName)

    if (install && install.platform === 'Browser') {
      resolve(true)
    }

    if (install && install.executable) {
      resolve(existsSync(install.executable))
    }
  })
}

async launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args: string[] = []
): Promise<boolean> {
  return launchGame(appName, logWriter, this.getGameInfo(appName), 'sideload', args)
}

async stop(appName: string): Promise<void> {
  const {
    install: { executable = undefined }
  } = this.getGameInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)

    if (!this.isNative(appName)) {
      const gameSettings = await this.getSettings(appName)
      shutdownWine(gameSettings)
    }
  }
}

async uninstall({
  appName,
  shouldRemovePrefix,
  deleteFiles = false
}: RemoveArgs): Promise<ExecResult> {
  sendGameStatusUpdate({
    appName,
    runner: 'sideload',
    status: 'uninstalling'
  })

  const old = libraryStore.get('games', [])
  const current = old.filter((a: GameInfo) => a.app_name !== appName)

  const gameInfo = this.getGameInfo(appName)
  const {
    title,
    install: { executable }
  } = gameInfo

  if (shouldRemovePrefix) {
    removePrefix(appName, 'sideload')
  }
  libraryStore.set('games', current)

  if (deleteFiles && executable !== undefined) {
    rmSync(dirname(executable), { recursive: true })
  }

  notify({ title, body: i18next.t('notify.uninstalled') })

  removeShortcutsUtil(gameInfo)
  removeRecentGame(appName)
  removeNonSteamGame({ gameInfo })

  sendGameStatusUpdate({
    appName,
    runner: 'sideload',
    status: 'done'
  })

  logInfo('finished uninstalling', LogPrefix.Backend)
  return { stderr: '', stdout: '' }
}

isNative(appName: string): boolean {
  const {
    install: { platform }
  } = this.getGameInfo(appName)
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

async getExtraInfo(appName: string): Promise<ExtraInfo> {
  logWarning(
    `getExtraInfo not implemented on Sideload Game Manager. called for appName = ${appName}`
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

/* eslint-disable @typescript-eslint/no-unused-vars */
onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
) {
  logWarning(
    `onInstallOrUpdateOutput not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
}

async moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  logWarning(
    `moveInstall not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return { status: 'error' }
}

async repair(appName: string): Promise<ExecResult> {
  logWarning(
    `repair not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return { stderr: '', stdout: '' }
}

async syncSaves(
  appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[]
): Promise<string> {
  logWarning(
    `syncSaves not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return ''
}

async forceUninstall(appName: string): Promise<void> {
  logWarning(
    `forceUninstall not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
}

async install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  logWarning(
    `install not implemented on Sideload Game Manager. called for appName = ${appName}`
  )
  return { status: 'error' }
}

async importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  return { stderr: '', stdout: '' }
}

async update(
  appName: string
): Promise<{ status: 'done' | 'error' }> {
  return { status: 'error' }
}
}
