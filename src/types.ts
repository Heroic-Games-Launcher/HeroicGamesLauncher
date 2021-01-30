export interface InstalledInfo {
  executable: string | null
  version: string | null
  install_size: string | null
  install_path: string | null
  is_dlc: boolean | null
}

export interface KeyImage {
  type: string
}

interface ExtraInfo {
  description: string
  shortDescription: string
}

export interface WineProps {
  name: string
  bin: string
}

export interface AppSettings {
  wineVersion: WineProps
  winePrefix: string
  otherOptions: string
  useGameMode: boolean
  showFps: boolean
  egsLinkedPath: string
  savesPath: string
  autoSyncSaves: boolean
  exitToTray: boolean
  launcherArgs: string
  audioFix: boolean
  showMangohud: boolean
  defaultInstallPath: string
}

export interface Game {
  art_cover: string
  art_square: string
  app_name: string
  art_logo: string
  executable: string
  title: string
  version: string
  install_size: number
  install_path: string
  developer: string
  isInstalled: boolean
  cloudSaveEnabled: boolean
  saveFolder: string
  folderName: string
  is_dlc: boolean
  extraInfo: ExtraInfo
}

export interface InstallProgress {
  percent: string
  bytes: string
  eta: string
}

export interface Path {
  filePaths: string[]
}
export interface WineProps {
  name: string
  bin: string
}

export interface GameStatus {
  appName: string
  status:
    | 'installing'
    | 'updating'
    | 'playing'
    | 'uninstalling'
    | 'repairing'
    | 'done'
    | 'canceled'
    | 'moving'
  progress?: number | null
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

export interface ContextType {
  user: string
  data: Game[]
  filter: string
  refreshing: boolean
  error: boolean
  libraryStatus: GameStatus[]
  refresh: () => void
  refreshLibrary: () => void
  handleGameStatus: (game: GameStatus) => void
  handleFilter: (value: string) => void
  handleSearch: (input: string) => void
}
