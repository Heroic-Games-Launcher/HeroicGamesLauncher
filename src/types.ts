import { VersionInfo } from 'heroic-wine-downloader'
interface About {
  description: string
  shortDescription: string
}
export interface AppSettings {
  altLegendaryBin: string
  altGogdlBin: string
  addDesktopShortcuts: boolean
  addStartMenuShortcuts: boolean
  audioFix: boolean
  autoInstallDxvk: boolean
  autoInstallVkd3d: boolean
  autoSyncSaves: boolean
  checkForUpdatesOnStartup: boolean
  customWinePaths: Array<string>
  darkTrayIcon: boolean
  defaultInstallPath: string
  disableController: boolean
  discordRPC: boolean
  egsLinkedPath: string
  exitToTray: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableFsync: boolean
  enableResizableBar: boolean
  language: string
  launcherArgs: string
  maxRecentGames: number
  maxSharpness: number
  maxWorkers: number
  minimizeOnLaunch: boolean
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions: string
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  showUnrealMarket: boolean
  startInTray: boolean
  useGameMode: boolean
  targetExe: string
  wineCrossoverBottle: string
  defaultWinePrefix: string
  winePrefix: string
  wineVersion: WineInstallation
  useSteamRuntime: boolean
}

export interface ContextType {
  category: string
  epicLibrary: GameInfo[]
  gogLibrary: GameInfo[]
  wineVersions: WineVersionInfo[]
  recentGames: GameInfo[]
  error: boolean
  filter: string
  filterText: string
  filterPlatform: string
  gameUpdates: string[]
  isRTL: boolean
  handleCategory: (value: string) => void
  handleFilter: (value: string) => void
  handlePlatformFilter: (value: string) => void
  handleGameStatus: (game: GameStatus) => Promise<void>
  handleLayout: (value: string) => void
  handleSearch: (input: string) => void
  layout: string
  libraryStatus: GameStatus[]
  platform: NodeJS.Platform | string
  refresh: (checkUpdates?: boolean) => Promise<void>
  refreshLibrary: (options: RefreshOptions) => Promise<void>
  refreshWineVersionInfo: (fetch: boolean) => void
  refreshing: boolean
}

interface ExtraInfo {
  about: About
  reqs: Reqs[]
}

export interface GameInfo {
  runner: Runner
  store_url: string
  app_name: string
  art_cover: string
  art_logo: string
  art_square: string
  cloud_save_enabled: boolean
  compatible_apps: string[]
  developer: string
  extra: ExtraInfo
  folder_name: string
  install: InstalledInfo
  is_game: boolean
  is_mac_native: boolean
  is_linux_native: boolean
  is_installed: boolean
  is_ue_asset: boolean
  is_ue_plugin: boolean
  is_ue_project: boolean
  namespace: unknown
  save_folder: string
  title: string
  canRunOffline: boolean
}

export interface GameSettings {
  audioFix: boolean
  autoInstallDxvk: boolean
  autoSyncSaves: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableFsync: boolean
  enableResizableBar: boolean
  maxSharpness: number
  launcherArgs: string
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions: string
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  targetExe: string
  useGameMode: boolean
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
  useSteamRuntime: boolean
}

type DLCInfo = {
  app_name: string
  title: string
}

type LaunchArguments = {
  name: string
  parameters: string
}

type GameInstallInfo = {
  app_name: string
  launch_options: Array<LaunchArguments>
  owned_dlc: Array<DLCInfo>
  title: string
  version: string
  platform_versions: { Mac: string; Windows: string }
}

type Prerequisites = {
  args: string
  name: string
  path: string
}

type GameManifest = {
  app_name: string
  disk_size: number
  download_size: number
  install_tags: Array<string>
  launch_exe: string
  prerequisites: Prerequisites
  languages?: Array<string>
}
export interface InstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}

export interface GameStatus {
  appName: string
  progress?: string
  folder?: string
  runner?: Runner
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
    | 'queued'
    | 'error'
}

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
  is_dlc: boolean | null
  version: string | null
  platform?: string
  appName?: string
  installedWithDLCs?: boolean // For verifing GOG games
  language?: string // For verifing GOG games
  versionEtag?: string // Checksum for checking GOG updates
  buildId?: string // For verifing GOG games
}

export interface KeyImage {
  type: string
}

export interface Path {
  path: string
}

export type RefreshOptions = {
  checkForUpdates?: boolean
  fullRefresh?: boolean
  runInBackground?: boolean
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
  type: 'wine' | 'proton' | 'crossover'
  wineboot?: string
  wineserver?: string
}

export interface WineVersionInfo extends VersionInfo {
  isInstalled: boolean
  hasUpdate: boolean
  installDir: string
}
export type ElWebview = {
  canGoBack: () => boolean
  canGoForward: () => boolean
  goBack: () => void
  goForward: () => void
  reload: () => void
  isLoading: () => boolean
  getURL: () => string
  copy: () => string
  selectAll: () => void
  findInPage: (text: string | RegExp) => void
}

export type Webview = HTMLWebViewElement & ElWebview

export interface GOGGameInfo {
  tags: string[]
  id: number
  availability: {
    isAvailable: boolean
    isAvailableInAccount: boolean
  }
  title: string
  url: string
  worksOn: {
    Windows: boolean
    Mac: boolean
    Linux: boolean
  }
  category: string
  rating: number
  isComingSoom: boolean
  isGame: boolean
  slug: string
  isNew: boolean
  dlcCount: number
  releaseDate: {
    date: string
    timezone_type: number
    timezone: string
  }
  isBaseProductMissing: boolean
  isHidingDisabled: boolean
  isInDevelopment: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraInfo: any[]
  isHidden: boolean
}
export interface GamepadActionStatus {
  [key: string]: {
    triggeredAt: { [key: number]: number }
    repeatDelay: false | number
  }
}

export type Runner = 'legendary' | 'gog' | 'heroic'
