export interface AppSettings {
  audioFix: boolean
  autoInstallDxvk: boolean
  autoSyncSaves: boolean
  customWinePaths: Array<string>
  darkTrayIcon: boolean
  defaultInstallPath: string
  egsLinkedPath: string
  exitToTray: boolean
  language: string
  launcherArgs: string
  maxWorkers: number
  offlineMode: boolean
  otherOptions: string
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  useGameMode: boolean
  userInfo: UserInfo
  winePrefix: string
  wineVersion: WineProps
}
export interface ContextType {
  data: Game[]
  error: boolean
  filter: string
  handleFilter: (value: string) => void
  handleGameStatus: (game: GameStatus) => void
  handleSearch: (input: string) => void
  libraryStatus: GameStatus[]
  refresh: () => void
  refreshLibrary: () => void
  refreshing: boolean
  user: string
}

interface ExtraInfo {
  description: string
  shortDescription: string
}

export interface Game {
  app_name: string
  art_cover: string
  art_logo: string
  art_square: string
  cloudSaveEnabled: boolean
  compatibleApps: string[]
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

export interface GameStatus {
  appName: string
  progress?: number | null
  status:
    | 'installing'
    | 'updating'
    | 'playing'
    | 'uninstalling'
    | 'repairing'
    | 'done'
    | 'canceled'
    | 'moving'
}

export interface InstallProgress {
  bytes: string
  eta: string
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

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

export type UserInfo = {
  account_id?: string
  displayName?: string
  epicId?: string
  name?: string
}
export interface WineProps {
  bin: string
  name: string
}
