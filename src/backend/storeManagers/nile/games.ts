import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings
  /* InstallArgs,
  InstallPlatform */
} from 'common/types'
import { InstallResult /* RemoveArgs */ } from 'common/types/game_manager'
// import { GOGCloudSavesLocation } from 'common/types/gog'
import { getGameInfo as nileLibraryGetGameInfo } from './library'
import { LogPrefix, logError } from 'backend/logger/logger'

export async function getSettings(/* appName: string */): Promise<GameSettings> {
  // TODO: Logic
  return {
    autoInstallDxvk: false,
    autoInstallVkd3d: false,
    autoSyncSaves: false,
    battlEyeRuntime: false,
    DXVKFpsCap: '',
    eacRuntime: false,
    enableDXVKFpsLimit: false,
    enableEsync: false,
    enableFSR: false,
    enableFsync: false,
    enviromentOptions: [],
    ignoreGameUpdates: false,
    language: '',
    launcherArgs: '',
    nvidiaPrime: false,
    offlineMode: false,
    preferSystemLibs: false,
    savesPath: '',
    showFps: false,
    showMangohud: false,
    targetExe: '',
    useGameMode: false,
    useSteamRuntime: false,
    wineCrossoverBottle: '',
    winePrefix: '',
    wineVersion: {
      bin: '',
      name: '',
      type: 'wine'
    },
    wrapperOptions: []
  }
}

export function getGameInfo(appName: string): GameInfo {
  const info = nileLibraryGetGameInfo(appName)
  if (!info) {
    logError(
      [
        'Could not get game info for',
        `${appName},`,
        'returning empty object. Something is probably gonna go wrong soon'
      ],
      LogPrefix.Nile
    )
    return {
      app_name: '',
      runner: 'nile',
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

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  const info = nileLibraryGetGameInfo(appName)
  return {
    reqs: [],
    about: info?.description
      ? {
          description: info.description,
          shortDescription: info.description
        }
      : undefined
  }
}

export async function importGame(): Promise<ExecResult> {
  /* appName: string,
  path: string,
  platform: InstallPlatform */
  return {
    stderr: '',
    stdout: ''
  }
}

export function onInstallOrUpdateOutput() {
  /* appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number */
  return
}

export async function install(): Promise<InstallResult> {
  /* appName: string,
  args: InstallArgs */
  return {
    status: 'abort'
  }
}

export function isNative(/* appName: string */): boolean {
  return false
}

export async function addShortcuts(/* appName: string, fromMenu?: boolean */) {
  return
}

export async function removeShortcuts(/* appName: string */) {
  return
}

export async function launch(): Promise<boolean> {
  /* appName: string,
  launchArguments?: string */
  return false
}

export async function moveInstall(): Promise<InstallResult> {
  /* appName: string,
  newInstallPath: string */
  return {
    status: 'abort'
  }
}

export async function repair(/* appName: string */): Promise<ExecResult> {
  return {
    stderr: '',
    stdout: ''
  }
}

export async function syncSaves(): Promise<string> {
  /* appName: string,
  arg: string,
  path: string,
  gogSaves?: GOGCloudSavesLocation[] */
  return ''
}

export async function uninstall(/* args: RemoveArgs */): Promise<ExecResult> {
  return {
    stderr: '',
    stdout: ''
  }
}

export async function update(/* appName: string */): Promise<InstallResult> {
  return {
    status: 'abort'
  }
}

export async function forceUninstall(/* appName: string */) {
  return
}

export async function stop(/* appName: string, stopWine?: boolean */) {
  return
}

export function isGameAvailable(/* appname: string */) {
  return true
}
