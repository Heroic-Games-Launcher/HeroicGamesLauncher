import type {
  ExtraInfo,
  GameInfo,
  InstallPlatform,
  GameSettings,
  ExecResult,
  InstallArgs,
  InstallInfo,
  LaunchOption,
  GOGAchievement,
  Runner,
  Reqs
} from 'common/types'
import type { GOGCloudSavesLocation } from './gog'
import type LogWriter from 'backend/logger/log_writer'

export interface InstallResult {
  status: 'done' | 'error' | 'abort'
  error?: string
}

export type RemoveArgs = {
  shouldRemovePrefix?: boolean
  deleteFiles?: boolean
}

export abstract class Game {
  abstract readonly id: string
  abstract readonly runner: Runner

  abstract toString(): string

  abstract getSettings(): Promise<GameSettings>
  abstract getGameInfo(): GameInfo
  abstract getExtraInfo(): Promise<ExtraInfo>
  abstract importGame(
    path: string,
    platform: InstallPlatform
  ): Promise<ExecResult>
  abstract onInstallOrUpdateOutput(
    action: 'installing' | 'updating',
    data: string,
    totalDownloadSize: number
  ): void
  abstract install(args: InstallArgs): Promise<InstallResult>
  abstract isNative(): boolean
  abstract addShortcuts(fromMenu?: boolean): Promise<void>
  abstract removeShortcuts(): Promise<void>
  abstract launch(
    logWriter: LogWriter,
    launchArguments?: LaunchOption,
    args?: string[],
    skipVersionCheck?: boolean
  ): Promise<boolean>
  abstract moveInstall(newInstallPath: string): Promise<InstallResult>
  abstract repair(): Promise<ExecResult>
  abstract syncSaves(
    arg: string,
    path: string,
    gogSaves?: GOGCloudSavesLocation[]
  ): Promise<string>
  abstract uninstall(args: RemoveArgs): Promise<ExecResult>
  abstract update(updateOverwrites?: {
    build?: string
    branch?: string
    language?: string
    dlcs?: string[]
    dependencies?: string[]
  }): Promise<InstallResult>
  abstract forceUninstall(): Promise<void>
  abstract stop(stopWine?: boolean): Promise<void>
  abstract isGameAvailable(): Promise<boolean>
  getAchievements?(lang: string): Promise<GOGAchievement[]>
  getChangelog?(): Promise<string | null>
  getGenres?(): Promise<string[] | null>
  getReleaseDate?(): Promise<Date | null>
  getDescription?(): Promise<string | null>
  getSystemRequirements?(): Promise<Reqs[] | null>
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
