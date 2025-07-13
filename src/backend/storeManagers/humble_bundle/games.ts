// gameService.ts

import LogWriter from 'backend/logger/log_writer'
import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import { GOGCloudSavesLocation } from 'common/types/gog'

export async function getSettings(appName: string): Promise<GameSettings> {
  return {} as GameSettings
}

export function getGameInfo(appName: string): GameInfo {
  return {} as GameInfo
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  return {} as ExtraInfo
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  return {} as ExecResult
}

export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
): void {
  // stub
}

export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  return {} as InstallResult
}

export function isNative(appName: string): boolean {
  return false
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  // stub
}

export async function removeShortcuts(appName: string): Promise<void> {
  // stub
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args?: string[],
  skipVersionCheck?: boolean
): Promise<boolean> {
  return false
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  return {} as InstallResult
}

export async function repair(appName: string): Promise<ExecResult> {
  return {} as ExecResult
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[]
): Promise<string> {
  return ''
}

export async function uninstall(args: RemoveArgs): Promise<ExecResult> {
  return {} as ExecResult
}

export async function update(
  appName: string,
  updateOverwrites?: {
    build?: string
    branch?: string
    language?: string
    dlcs?: string[]
    dependencies?: string[]
  }
): Promise<InstallResult> {
  return {} as InstallResult
}

export async function forceUninstall(appName: string): Promise<void> {
  // stub
}

export async function stop(appName: string, stopWine?: boolean): Promise<void> {
  // stub
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  return false
}
