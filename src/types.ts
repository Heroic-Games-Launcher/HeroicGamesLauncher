interface ExtraInfo {
  description: string
  shortDescription: string
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
  defaultInstallPath: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'
export interface InstallProgress {
  percent: string
  bytes: string
  eta: string
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
  extraInfo: ExtraInfo
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
  progress?: number | null
}

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
