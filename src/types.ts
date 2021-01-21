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
  defaultInstallPath: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

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

export interface PlayStatus {
  appName: string
  status: boolean
}

export interface ContextType {
  user: string
  data: Game[]
  installing: string[]
  filter: string
  playing: PlayStatus[]
  refreshing: boolean
  error: boolean
  refresh: () => void
  refreshLibrary: () => void
  handleInstalling: (game: string) => void
  handlePlaying: (game: PlayStatus) => void
  handleFilter: (value: string) => void
  handleSearch: (input: string) => void
}
