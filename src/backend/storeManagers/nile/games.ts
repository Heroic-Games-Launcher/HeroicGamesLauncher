import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform
} from 'common/types'
import { InstallResult, RemoveArgs } from 'common/types/game_manager'
import { GOGCloudSavesLocation } from 'common/types/gog'

export async function getSettings(appName: string): Promise<GameSettings> {
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
  return {
    app_name: '',
    art_cover: '',
    art_square: '',
    canRunOffline: false,
    install: {},
    is_installed: false,
    runner: 'nile',
    title: ''
  }
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  return {
    reqs: []
  }
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  return {
    stderr: '',
    stdout: ''
  }
}

export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
) {}

export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  return {
    status: 'abort'
  }
}

export function isNative(appName: string): boolean {
  return false
}

export async function addShortcuts(appName: string, fromMenu?: boolean) {}

export async function removeShortcuts(appName: string) {}

export async function launch(
  appName: string,
  launchArguments?: string
): Promise<boolean> {
  return false
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  return {
    status: 'abort'
  }
}

export async function repair(appName: string): Promise<ExecResult> {
  return {
    stderr: '',
    stdout: ''
  }
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
  return {
    stderr: '',
    stdout: ''
  }
}

export async function update(appName: string): Promise<InstallResult> {
  return {
    status: 'abort'
  }
}

export async function forceUninstall(appName: string) {}

export async function stop(appName: string, stopWine?: boolean) {}

export function isGameAvailable(appname: string) {
  return true
}
