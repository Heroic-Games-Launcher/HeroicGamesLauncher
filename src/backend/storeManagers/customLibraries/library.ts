import {
  ExecResult,
  LaunchOption,
  CustomLibraryGameInfo
} from 'common/types'
import { logWarning } from 'backend/logger'
import type { InstallPlatform } from 'common/types'

/**
 * Loads installed data and adds it into a Map
 */
export function refreshInstalled() {
  logWarning(
    `refreshInstalled not implemented on custom library library manager`
  )
}

export async function initCustomLibraryManager() {
  logWarning(
    `initCustomLibraryManager not implemented on custom library library manager`
  )
}

export async function refresh(): Promise<ExecResult> {
  logWarning(
    `refresh not implemented on custom library library manager`
  )
  return {
    stdout: '',
    stderr: '',
  }
}

export function getGameInfo(appName: string): CustomLibraryGameInfo {
  logWarning(
    `getGameInfo not implemented on custom library library manager. called for appName = ${appName}`
  )
  return {
    runner: 'customLibrary',
    app_name: appName,
    art_cover: '',
    art_square: '',
    install: {},
    is_installed: false,
    title: '',
    canRunOffline: false,
  }
}

export async function getInstallInfo(appName: string): Promise<any> {
  logWarning(
    `getInstallInfo not implemented on custom library library manager. called for appName = ${appName}`
  )
  return {
    install_path: '',
    executable: '',
  }
}

export async function importGame(
  gameInfo: CustomLibraryGameInfo,
  installPath: string,
  platform: InstallPlatform
): Promise<void> {
  logWarning(
    `importGame not implemented on custom library library manager. called for gameInfo = ${gameInfo}`
  )
}

export function installState() {
  logWarning(`installState not implemented on Sideload Library Manager`)
}

export async function listUpdateableGames(): Promise<string[]> {
  logWarning(`listUpdateableGames not implemented on Sideload Library Manager`)
  return []
}

export async function runRunnerCommand(): Promise<ExecResult> {
  logWarning(`runRunnerCommand not implemented on Sideload Library Manager`)
  return { stdout: '', stderr: '' }
}

export async function changeGameInstallPath(): Promise<void> {
  logWarning(
    `changeGameInstallPath not implemented on Sideload Library Manager`
  )
}

export const getLaunchOptions = (appName: string): LaunchOption[] => {
  logWarning(
    `getLaunchOptions not implemented on custom library library manager. called for appName = ${appName}`
  )
  return []
}

export function changeVersionPinnedStatus() {
  logWarning(
    'changeVersionPinnedStatus not implemented on Sideload Library Manager'
  )
}
