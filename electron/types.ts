interface About {
  description: string
  shortDescription: string
}

export interface AppSettings {
  audioFix: boolean
  autoInstallDxvk: boolean
  autoSyncSaves: boolean
  customWinePaths: string[]
  darkTrayIcon: boolean
  defaultInstallPath: string
  discordRPC: boolean
  egsLinkedPath: string
  enableDesktopShortcutsOnDesktop: boolean,
  enableDesktopShortcutsOnStartMenu: boolean,
  exitToTray: boolean,
  language: string,
  launcherArgs: string,
  maxWorkers: number,
  nvidiaPrime: boolean,
  offlineMode: boolean,
  otherOptions: string,
  savesPath: string,
  showFps: boolean,
  showMangohud: boolean,
  useGameMode: boolean,
  userInfo: UserInfo,
  winePrefix: string,
  wineVersion: WineInstallation
}

export type ExecResult = void | {stderr : string, stdout : string}
export interface ExtraInfo {
  about: About
  reqs: Reqs[]
}

export type GameConfigVersion = 'auto' | 'v0' | 'v0.1'
export interface GameInfo {
  app_name: string,
  art_cover: string,
  art_logo: string,
  art_square: string,
  cloud_save_enabled: boolean,
  compatible_apps: string[],
  developer: string,
  extra: ExtraInfo,
  folder_name: string,
  install: InstalledInfo,
  is_game: boolean,
  is_installed: boolean,
  is_ue_asset: boolean,
  is_ue_plugin: boolean,
  is_ue_project: boolean,
  namespace: string,
  save_folder: string,
  title: string
}

export interface GameSettings {
  audioFix: boolean
  autoInstallDxvk: boolean
  autoSyncSaves: boolean
  launcherArgs: string
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions: string
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  useGameMode: boolean
  winePrefix: string
  wineVersion: WineInstallation
}

export interface GameStatus {
  appName: string
  progress?: number | null
  status:
    | 'installing'
    | 'updating'
    | 'launching'
    | 'playing'
    | 'uninstalling'
    | 'repairing'
    | 'done'
    | 'canceled'
    | 'moving'
}

export type GlobalConfigVersion = 'auto' | 'v0'
export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent: string
}
export interface InstalledInfo {
  executable: string | null
  install_path: string | null
  install_size: string | null
  is_dlc: boolean
  version: string | null
}
export interface KeyImage {
  type: string
}

export interface Path {
  filePaths: string[]
}

export interface RawGameJSON {
  app_name: string
  art_cover: string
  art_logo: string
  art_square: string
  cloudSaveEnabled: boolean
  developer: string
  executable: string
  extraInfo: ExtraInfo
  folderName: string
  install_path: string
  install_size: number
  isInstalled: boolean
  is_dlc: boolean
  saveFolder: string
  title: string
  version: string
}

interface Reqs {
  minimum: string
  recommended: string
  title: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'


export type UserInfo = {
  account_id?: string
  displayName?: string
  epicId?: string
  name?: string
}
export interface WineInstallation {
  bin: string
  name: string
}
