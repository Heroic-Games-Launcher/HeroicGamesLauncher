export interface InstalledInfo {
  executable: string | null
  version: string | null
  install_size: string | null
  install_path: string | null
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
  extraInfo: ExtraInfo
}
