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
import { apiInfoCache } from './electronStores'

function getProductFromAppName(appName: string) {
  const products = apiInfoCache.get('humble_api_info') || {}
  const product = products[appName]

  return product
}

export async function getSettings(appName: string): Promise<GameSettings> {
  console.log('getSettings called with:', { appName })
  return {} as GameSettings
}

export function getGameInfo(appName: string): GameInfo {
  console.log('getGameInfo called with:', { appName })
  return {} as GameInfo
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const product = getProductFromAppName(appName)
  return {
    reqs: [],
    about: {
      description: product.display_item['description-text'],
      shortDescription: product.display_item['description-text']
    }
  }
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  console.log('importGame called with:', { appName, path, platform })
  return {} as ExecResult
}

export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
): void {
  console.log('onInstallOrUpdateOutput called with:', {
    appName,
    action,
    data,
    totalDownloadSize
  })
}

export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  console.log('install called with:', { appName, args })
  return {} as InstallResult
}

export function isNative(appName: string): boolean {
  console.log('isNative called with:', { appName })
  return false
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  console.log('addShortcuts called with:', { appName, fromMenu })
}

export async function removeShortcuts(appName: string): Promise<void> {
  console.log('removeShortcuts called with:', { appName })
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args?: string[],
  skipVersionCheck?: boolean
): Promise<boolean> {
  console.log('launch called with:', {
    appName,
    logWriter,
    launchArguments,
    args,
    skipVersionCheck
  })
  return false
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  console.log('moveInstall called with:', { appName, newInstallPath })
  return {} as InstallResult
}

export async function repair(appName: string): Promise<ExecResult> {
  console.log('repair called with:', { appName })
  return {} as ExecResult
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[]
): Promise<string> {
  console.log('syncSaves called with:', { appName, arg, path, gogSaves })
  return ''
}

export async function uninstall(args: RemoveArgs): Promise<ExecResult> {
  console.log('uninstall called with:', { args })
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
  console.log('update called with:', { appName, updateOverwrites })
  return {} as InstallResult
}

export async function forceUninstall(appName: string): Promise<void> {
  console.log('forceUninstall called with:', { appName })
}

export async function stop(appName: string, stopWine?: boolean): Promise<void> {
  console.log('stop called with:', { appName, stopWine })
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  console.log('isGameAvailable called with:', { appName })
  return false
}
