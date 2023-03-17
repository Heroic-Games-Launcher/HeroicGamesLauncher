import {
  ExtraInfo,
  GameInfo,
  InstallPlatform,
  GameSettings,
  ExecResult,
  InstallArgs,
  CallRunnerOptions,
  HyperPlayInstallInfo
} from 'common/types'
import { GOGCloudSavesLocation, GogInstallInfo } from './gog'
import { LegendaryInstallInfo } from './legendary'

export interface InstallResult {
  status: 'done' | 'error' | 'abort'
  error?: string
}

export type RemoveArgs = {
  appName: string
  shouldRemovePrefix?: boolean
  deleteFiles?: boolean
}

export interface GameManager {
  getSettings: (appName: string) => Promise<GameSettings>
  getGameInfo: (appName: string) => GameInfo
  getExtraInfo: (appName: string) => Promise<ExtraInfo>
  importGame: (
    appName: string,
    path: string,
    platform: InstallPlatform
  ) => Promise<ExecResult>
  onInstallOrUpdateOutput: (
    appName: string,
    action: 'installing' | 'updating',
    data: string,
    totalDownloadSize: number
  ) => void
  install: (appName: string, args: InstallArgs) => Promise<InstallResult>
  isNative: (appName: string) => boolean
  addShortcuts: (appName: string, fromMenu?: boolean) => Promise<void>
  removeShortcuts: (appName: string) => Promise<void>
  launch: (appName: string, launchArguments?: string) => Promise<boolean>
  moveInstall: (
    appName: string,
    newInstallPath: string
  ) => Promise<InstallResult>
  repair: (appName: string) => Promise<ExecResult>
  syncSaves: (
    appName: string,
    arg: string,
    path: string,
    gogSaves?: GOGCloudSavesLocation[]
  ) => Promise<string>
  uninstall: (args: RemoveArgs) => Promise<ExecResult>
  update: (appName: string) => Promise<InstallResult>
  forceUninstall: (appName: string) => Promise<void>
  stop: (appName: string) => Promise<void>
  isGameAvailable: (appName: string) => boolean
}

export interface LibraryManager {
  refresh: () => Promise<ExecResult | null>
  getGameInfo: (appName: string, forceReload?: boolean) => GameInfo | undefined
  getInstallInfo: (
    appName: string,
    installPlatform: InstallPlatform,
    lang?: string
  ) => Promise<
    LegendaryInstallInfo | GogInstallInfo | HyperPlayInstallInfo | undefined
  >
  listUpdateableGames: () => Promise<string[]>
  changeGameInstallPath: (appName: string, newPath: string) => Promise<void>
  installState: (appName: string, state: boolean) => void
  runRunnerCommand: (
    commandParts: string[],
    abortController: AbortController,
    options?: CallRunnerOptions
  ) => Promise<ExecResult>
}
