import {
  ExtraInfo,
  GameInfo,
  InstallPlatform,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstallInfo,
  LaunchOption,
  GOGAchievement
} from 'common/types'
import { GOGCloudSavesLocation } from './gog'
import type LogWriter from 'backend/logger/log_writer'

export interface InstallResult {
  status: 'done' | 'error' | 'abort'
  error?: string
}

export type RemoveArgs = {
  shouldRemovePrefix?: boolean
  deleteFiles?: boolean
}

export interface Game {
  getSettings: () => Promise<GameSettings>
  getGameInfo: () => GameInfo
  getExtraInfo: () => Promise<ExtraInfo>
  importGame: (path: string, platform: InstallPlatform) => Promise<ExecResult>
  onInstallOrUpdateOutput: (
    action: 'installing' | 'updating',
    data: string,
    totalDownloadSize: number
  ) => void
  install: (args: InstallArgs) => Promise<InstallResult>
  isNative: () => boolean
  addShortcuts: (fromMenu?: boolean) => Promise<void>
  removeShortcuts: () => Promise<void>
  launch: (
    logWriter: LogWriter,
    launchArguments?: LaunchOption,
    args?: string[],
    skipVersionCheck?: boolean
  ) => Promise<boolean>
  moveInstall: (newInstallPath: string) => Promise<InstallResult>
  repair: () => Promise<ExecResult>
  syncSaves: (
    arg: string,
    path: string,
    gogSaves?: GOGCloudSavesLocation[]
  ) => Promise<string>
  uninstall: (args: RemoveArgs) => Promise<ExecResult>
  /**
   * Optional runner-specific cleanup for a partial (incomplete) install, i.e. a
   * download that was started but never finished.
   *
   * Runners that don't implement this still get partial-install cleanup: the
   * uninstaller falls back to a generic routine that cancels any active download
   * and deletes the leftover folder, which works for any runner using Heroic's
   * download queue. Implement this only when a runner needs extra teardown.
   */
  cleanUpPartialInstall?: (partialInstallFolder: string) => Promise<void>
  update: (updateOverwrites?: {
    build?: string
    branch?: string
    language?: string
    dlcs?: string[]
    dependencies?: string[]
  }) => Promise<InstallResult>
  forceUninstall: () => Promise<void>
  stop: (stopWine?: boolean) => Promise<void>
  isGameAvailable: () => Promise<boolean>
  getAchievements?: (lang: string) => Promise<GOGAchievement[]>
}

export interface LibraryManager {
  init: () => Promise<void>
  getGame: (id: string) => Game
  refresh: () => Promise<ExecResult | null>
  getGameInfo: (appName: string, forceReload?: boolean) => GameInfo | undefined
  getInstallInfo: (
    appName: string,
    installPlatform: InstallPlatform,
    options: {
      branch?: string
      build?: string
      lang?: string
      retries?: number
    }
  ) => Promise<InstallInfo | undefined>
  listUpdateableGames: () => Promise<string[]>
  changeGameInstallPath: (appName: string, newPath: string) => Promise<void>
  changeVersionPinnedStatus: (appName: string, status: boolean) => void
  installState: (appName: string, state: boolean) => void
  getLaunchOptions: (
    appName: string
  ) => LaunchOption[] | Promise<LaunchOption[]>
}
