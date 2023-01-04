import { GOGCloudSavesLocation, GogInstallPlatform } from './types/gog'
import { LegendaryInstallPlatform } from './types/legendary'
import { VersionInfo } from 'heroic-wine-downloader'
import { IpcRendererEvent } from 'electron'
import { ChildProcess } from 'child_process'

export type Runner = 'legendary' | 'gog' | 'sideload'

// NOTE: Do not put enum's in this module or it will break imports

export type DialogType = 'MESSAGE' | 'ERROR'

export interface ButtonOptions {
  text: string
  onClick?: () => void
}

export type LaunchParams = {
  appName: string
  launchArguments: string
  runner: Runner
}

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
  body?: string
}

export interface AppSettings extends GameSettings {
  addDesktopShortcuts: boolean
  addStartMenuShortcuts: boolean
  addSteamShortcuts: boolean
  altGogdlBin: string
  altLegendaryBin: string
  autoUpdateGames: boolean
  checkForUpdatesOnStartup: boolean
  checkUpdatesInterval: number
  customThemesPath: string
  customWinePaths: string[]
  darkTrayIcon: boolean
  defaultInstallPath: string
  defaultSteamPath: string
  defaultWinePrefix: string
  disableController: boolean
  discordRPC: boolean
  downloadNoHttps: boolean
  egsLinkedPath: string
  enableUpdates: boolean
  exitToTray: boolean
  hideChangelogsOnStartup: boolean
  libraryTopSection: LibraryTopSectionOptions
  maxRecentGames: number
  maxWorkers: number
  minimizeOnLaunch: boolean
  startInTray: boolean
  userInfo: UserInfo
}

export type LibraryTopSectionOptions =
  | 'disabled'
  | 'recently_played'
  | 'recently_played_installed'
  | 'favourites'

export type ExecResult = {
  stderr: string
  stdout: string
  fullCommand?: string
  error?: string
  abort?: boolean
}

export interface ExtraInfo {
  about: About
  reqs: Reqs[]
  storeUrl: string
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
  // NOTE: This is the save folder without any variables filled in...
  save_folder: string
  // ...and this is the folder with them filled in
  save_path?: string
  gog_save_location?: GOGCloudSavesLocation[]
  title: string
  canRunOffline: boolean
  thirdPartyManagedApp: string | undefined
  is_mac_native: boolean
  is_linux_native: boolean
}

export interface GameSettings {
  autoInstallDxvk: boolean
  autoInstallVkd3d: boolean
  preferSystemLibs: boolean
  autoSyncSaves: boolean
  battlEyeRuntime: boolean
  eacRuntime: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableFsync: boolean
  maxSharpness?: number
  language: string
  launcherArgs: string
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions?: string //deprecated
  enviromentOptions: EnviromentVariable[]
  wrapperOptions: WrapperVariable[]
  savesPath: string
  showFps: boolean
  enableDXVKFpsLimit: boolean
  DXVKFpsCap: string //Entered as string but used as number
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
  downSpeed?: number
  diskSpeed?: number
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

export interface Reqs {
  minimum: string
  recommended: string
  title: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

export type UserInfo = {
  account_id: string
  displayName: string
  user: string
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
  platformToInstall: InstallPlatform
  installDlcs?: boolean
  sdlList?: string[]
  installLanguage?: string
}

export interface InstallParams extends InstallArgs {
  appName: string
  gameInfo: GameInfo
  runner: Runner
  size?: string
}

export interface UpdateParams {
  appName: string
  gameInfo: GameInfo
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

export type GamepadInputEvent =
  | GamepadInputEventKey
  | GamepadInputEventWheel
  | GamepadInputEventMouse

interface GamepadInputEventKey {
  type: 'keyDown' | 'keyUp' | 'char'
  keyCode: string
}

interface GamepadInputEventWheel {
  type: 'mouseWheel'
  deltaY: number
  x: number
  y: number
}

interface GamepadInputEventMouse {
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
  verboseLogFile?: string
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

export type GamepadActionStatus = Record<
  ValidGamepadAction,
  {
    triggeredAt: { [key: number]: number }
    repeatDelay: false | number
  }
>

export type ValidGamepadAction = GamepadActionArgs['action']

export type GamepadActionArgs =
  | GamepadActionArgsWithMetadata
  | GamepadActionArgsWithoutMetadata

interface GamepadActionArgsWithMetadata {
  action: 'leftClick' | 'rightClick'
  metadata: {
    elementTag: string
    x: number
    y: number
  }
}

interface GamepadActionArgsWithoutMetadata {
  action:
    | 'padUp'
    | 'padDown'
    | 'padLeft'
    | 'padRight'
    | 'leftStickUp'
    | 'leftStickDown'
    | 'leftStickLeft'
    | 'leftStickRight'
    | 'rightStickUp'
    | 'rightStickDown'
    | 'rightStickLeft'
    | 'rightStickRight'
    | 'mainAction'
    | 'back'
    | 'altAction'
    | 'esc'
  metadata?: undefined
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

export type ConnectivityChangedCallback = (
  event: IpcRendererEvent,
  status: ConnectivityStatus
) => void

export type ConnectivityStatus = 'offline' | 'check-online' | 'online'

export interface Tools {
  exe?: string
  tool: string
  appName: string
  runner: Runner
}

export type RecentGame = {
  appName: string
  title: string
}

export interface UpdateParams {
  gameInfo: GameInfo
}

export interface DMQueueElement {
  type: 'update' | 'install'
  params: InstallParams
  addToQueueTime: number
  startTime: number
  endTime: number
  status?: 'done' | 'error' | 'abort'
}

export type WineCommandArgs = {
  commandParts: string[]
  wait: boolean
  protonVerb?: ProtonVerb
  gameSettings?: GameSettings
  installFolderName?: string
  options?: CallRunnerOptions
  startFolder?: string
  skipPrefixCheckIKnowWhatImDoing?: boolean
}

export interface SideloadGame {
  runner: Runner
  app_name: string
  art_cover: string
  art_square: string
  is_installed: boolean
  title: string
  install: {
    executable: string
    platform: InstallPlatform
  }
  folder_name?: string
  canRunOffline: boolean
}

export type ProtonVerb =
  | 'run'
  | 'waitforexitandrun'
  | 'runinprefix'
  | 'destroyprefix'
  | 'getcompatpath'
  | 'getnativepath'

export interface SaveSyncArgs {
  arg: string | undefined
  path: string
  appName: string
  runner: Runner
}

export interface RunWineCommandArgs {
  appName: string
  runner: Runner
  commandParts: string[]
}

export interface ImportGameArgs {
  appName: string
  path: string
  runner: Runner
  platform: InstallPlatform
}

export interface MoveGameArgs {
  appName: string
  path: string
  runner: Runner
}

export interface DiskSpaceData {
  free: number
  diskSize: number
  message: string
  validPath: boolean
}

export interface ToolArgs {
  winePrefix: string
  winePath: string
  action: 'backup' | 'restore'
}

export type StatusPromise = Promise<{ status: 'done' | 'error' }>
