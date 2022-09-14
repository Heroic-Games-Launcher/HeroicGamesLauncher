import { GOGCloudSavesLocation, GogInstallPlatform } from './types/gog'
import { LegendaryInstallPlatform } from './types/legendary'
import { ChildProcess } from 'child_process'
import { VersionInfo } from 'heroic-wine-downloader'

export type Runner = 'legendary' | 'gog'

interface About {
  description: string
  longDescription: string
}

export type Release = {
  type: 'stable' | 'beta'
  html_url: string
  name: string
  tag_name: string
  published_at: string
  prerelease: boolean
  id: number
}

export interface AppSettings {
  checkUpdatesInterval: number
  enableUpdates: boolean
  addDesktopShortcuts: boolean
  addStartMenuShortcuts: boolean
  altLegendaryBin: string
  altGogdlBin: string
  audioFix: boolean
  autoInstallDxvk: boolean
  autoInstallVkd3d: boolean
  preferSystemLibs: boolean
  autoSyncSaves: boolean
  battlEyeRuntime: boolean
  checkForUpdatesOnStartup: boolean
  customWinePaths: string[]
  darkTrayIcon: boolean
  defaultInstallPath: string
  defaultSteamPath: string
  disableController: boolean
  discordRPC: boolean
  eacRuntime: boolean
  downloadNoHttps: boolean
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
  otherOptions?: string //depricated
  enviromentOptions: EnviromentVariable[]
  wrapperOptions: WrapperVariable[]
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  startInTray: boolean
  useGameMode: boolean
  targetExe: string
  userInfo: UserInfo
  wineCrossoverBottle: string
  winePrefix: string
  defaultWinePrefix: string
  wineVersion: WineInstallation
  useSteamRuntime: boolean
  gogSaves?: GOGCloudSavesLocation[]
}

export type ExecResult = {
  stderr: string
  stdout: string
  fullCommand?: string
  error?: string
}

export interface ExtraInfo {
  about: About
  reqs: Reqs[]
}

export type GameConfigVersion = 'auto' | 'v0' | 'v0.1'
export interface GameInfo {
  runner: Runner
  store_url: string
  app_name: string
  art_cover: string
  art_logo?: string
  art_square: string
  cloud_save_enabled: boolean
  developer: string
  extra: ExtraInfo
  folder_name: string
  install: Partial<InstalledInfo>
  is_installed: boolean
  namespace: string
  save_folder: string
  gog_save_location?: GOGCloudSavesLocation[]
  title: string
  canRunOffline: boolean
  is_mac_native: boolean
  is_linux_native: boolean
}
export interface GameSettings {
  audioFix: boolean
  autoInstallDxvk: boolean
  autoInstallVkd3d: boolean
  preferSystemLibs: boolean
  autoSyncSaves: boolean
  battlEyeRuntime: boolean
  eacRuntime: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableFsync: boolean
  enableResizableBar: boolean
  maxSharpness: number
  language: string
  launcherArgs: string
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions?: string //deprecated
  enviromentOptions: EnviromentVariable[]
  wrapperOptions: WrapperVariable[]
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  targetExe: string
  useGameMode: boolean
  useSteamRuntime: boolean
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
  gogSaves?: GOGCloudSavesLocation[]
}

export interface GameStatus {
  appName: string
  progress?: InstallProgress
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

export type GlobalConfigVersion = 'auto' | 'v0'
export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent: number
}
export interface InstalledInfo {
  executable: string
  install_path: string
  install_size: string
  is_dlc: boolean
  version: string
  platform: InstallPlatform
  appName?: string
  installedWithDLCs?: boolean // For verifing GOG games
  language?: string // For verifing GOG games
  versionEtag?: string // Checksum for checking GOG updates
  buildId?: string // For verifing GOG games
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
  user?: string
}
export interface WineInstallation {
  bin: string
  name: string
  type: 'wine' | 'proton' | 'crossover'
  lib?: string
  lib32?: string
  wineboot?: string
  wineserver?: string
}

export interface InstallArgs {
  path: string
  installDlcs?: boolean
  sdlList: string[]
  platformToInstall: InstallPlatform
  installLanguage?: string
}

export interface InstallParams extends InstallArgs {
  appName: string
  runner: Runner
}

export interface GOGLoginData {
  expires_in: number
  access_token: string
  refresh_token: string
  user_id: string
  loginTime: number
}

export interface GOGGameInfo {
  tags: string[]
  id: number
  image: string
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

export interface GOGImportData {
  // "appName": "1441974651", "buildId": "55136646198962890", "title": "Prison Architect", "tasks": [{"category": "launcher", "isPrimary": true, "languages": ["en-US"], "name": "Prison Architect", "osBitness": ["64"], "path": "Launcher/dowser.exe", "type": "FileTask"}, {"category": "game", "isHidden": true, "languages": ["en-US"], "name": "Prison Architect - launcher process Prison Architect64_exe", "osBitness": ["64"], "path": "Prison Architect64.exe", "type": "FileTask"}, {"category": "document", "languages": ["en-US"], "link": "http://www.gog.com/support/prison_architect", "name": "Support", "type": "URLTask"}, {"category": "other", "languages": ["en-US"], "link": "http://www.gog.com/forum/prison_architect/prison_break_escape_map_megathread/post1", "name": "Escape Map Megathread", "type": "URLTask"}], "installedLanguage": "en-US"}
  appName: string
  buildId: string
  title: string
  tasks: Array<{
    category: string
    isPrimary?: boolean
    languages?: Array<string>
    arguments?: Array<string> | string
    path: string
    name: string
    type: string
  }>
  installedLanguage: string
  platform: GogInstallPlatform
  versionName: string
  installedWithDlcs: boolean
}

export interface GamepadInputEventKey {
  type: 'keyDown' | 'keyUp' | 'char'
  keyCode: string
}

export interface GamepadInputEventWheel {
  type: 'mouseWheel'
  deltaY: number
  x: number
  y: number
}

export interface GamepadInputEventMouse {
  type: 'mouseDown' | 'mouseUp'
  x: number
  y: number
  button: 'left' | 'middle' | 'right'
}

export interface SteamRuntime {
  path: string
  type: 'soldier' | 'scout'
  args: string[]
}

export interface LaunchPreperationResult {
  success: boolean
  failureReason?: string
  rpcClient?: RpcClient
  mangoHudCommand?: string[]
  gameModeBin?: string
  steamRuntime?: string[]
  offlineMode?: boolean
}

export interface RpcClient {
  updatePresence(d: unknown): void
  reply(user: unknown, response: unknown): void
  disconnect(): void
}

export interface CallRunnerOptions {
  logMessagePrefix?: string
  logFile?: string
  env?: Record<string, string> | NodeJS.ProcessEnv
  wrappers?: string[]
  onOutput?: (output: string, child: ChildProcess) => void
}

export interface EnviromentVariable {
  key: string
  value: string
}

export interface WrapperVariable {
  exe: string
  args: string
}

export type AntiCheatStatus =
  | 'Planned'
  | 'Denied'
  | 'Broken'
  | 'Supported'
  | 'Running'

export type AntiCheat =
  | 'Arbiter'
  | 'BattlEye'
  | 'Denuvo Anti-Cheat'
  | 'Easy Anti-Cheat'
  | 'EQU8'
  | 'FACEIT'
  | 'FairFight'
  | 'Mail.ru Anti-Cheat'
  | 'miHoYo Protect'
  | 'miHoYo Protect 2'
  | 'NEAC Protect'
  | 'Nexon Game Security'
  | 'nProtect GameGuard'
  | 'PunkBuster'
  | 'RICOCHET'
  | 'Sabreclaw'
  | 'Treyarch Anti-Cheat'
  | 'UNCHEATER'
  | 'Unknown (Custom)'
  | 'VAC'
  | 'Vanguard'
  | 'Warden'
  | 'XIGNCODE3'
  | 'Zakynthos'

export interface AntiCheatInfo {
  status: ''
  anticheats: AntiCheat[]
  notes: string[]
  native: boolean
  storeIds: {
    epic?: {
      namespace: string
      slug: string
    }
    steam?: string
  }
  reference: string
  updates: AntiCheatReference[]
}

interface AntiCheatReference {
  name: string
  date: string
  reference: string
}

export interface Runtime {
  id: number
  name: string
  created_at: string
  architecture: string
  url: string
}

export type RuntimeName = 'eac_runtime' | 'battleye_runtime'

export interface HiddenGame {
  appName: string
  title: string
}

export type FavouriteGame = HiddenGame

export type RefreshOptions = {
  checkForUpdates?: boolean
  fullRefresh?: boolean
  library?: Runner | 'all'
  runInBackground?: boolean
}

export interface WineVersionInfo extends VersionInfo {
  isInstalled: boolean
  hasUpdate: boolean
  installDir: string
}

export interface GamepadActionStatus {
  [key: string]: {
    triggeredAt: { [key: number]: number }
    repeatDelay: false | number
  }
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

export type WebviewType = HTMLWebViewElement & ElWebview

export type InstallPlatform = LegendaryInstallPlatform | GogInstallPlatform
