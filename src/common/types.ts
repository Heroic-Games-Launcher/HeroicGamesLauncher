import {
  GOGCloudSavesLocation,
  GogInstallInfo,
  GogInstallPlatform
} from './types/gog'
import {
  LegendaryInstallPlatform,
  GameMetadataInner,
  LegendaryInstallInfo
} from './types/legendary'
import { TitleBarOverlay } from 'electron'
import { ChildProcess } from 'child_process'
import type { HowLongToBeatEntry } from 'backend/wiki_game_info/howlongtobeat/utils'
import { NileInstallInfo, NileInstallPlatform } from './types/nile'

export type Runner = 'legendary' | 'gog' | 'sideload' | 'nile'

// NOTE: Do not put enum's in this module or it will break imports

export type DialogType = 'MESSAGE' | 'ERROR'

export interface ButtonOptions {
  text: string
  onClick?: () => void
}

export type LaunchParams = {
  appName: string
  launchArguments?: LaunchOption
  runner: Runner
  skipVersionCheck?: boolean
}

export type LaunchOption = BaseLaunchOption | DLCLaunchOption

export interface BaseLaunchOption {
  type?: 'basic'
  name: string
  parameters: string
}

interface DLCLaunchOption {
  type: 'dlc'
  dlcAppName: string
  dlcTitle: string
}

interface About {
  description: string
  shortDescription: string
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

export type ExperimentalFeatures = {
  enableNewDesign: boolean
  enableHelp: boolean
  cometSupport: boolean
  umuSupport: boolean
}

export interface AppSettings extends GameSettings {
  addDesktopShortcuts: boolean
  addStartMenuShortcuts: boolean
  addSteamShortcuts: boolean
  altGogdlBin: string
  altCometBin: string
  altLegendaryBin: string
  altNileBin: string
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
  disablePlaytimeSync: boolean
  disableLogs: boolean
  discordRPC: boolean
  downloadNoHttps: boolean
  egsLinkedPath: string
  enableUpdates: boolean
  exitToTray: boolean
  experimentalFeatures?: ExperimentalFeatures
  framelessWindow: boolean
  hideChangelogsOnStartup: boolean
  libraryTopSection: LibraryTopSectionOptions
  maxRecentGames: number
  maxWorkers: number
  minimizeOnLaunch: boolean
  startInTray: boolean
  allowInstallationBrokenAnticheat: boolean
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
  about?: About
  reqs: Reqs[]
  releaseDate?: string
  storeUrl?: string
  changelog?: string
  genres?: string[]
}

export type GameConfigVersion = 'auto' | 'v0' | 'v0.1'

export interface GameInfo {
  runner: 'legendary' | 'gog' | 'sideload' | 'nile'
  store_url?: string
  app_name: string
  art_cover: string
  art_logo?: string
  art_background?: string
  art_icon?: string
  art_square: string
  cloud_save_enabled?: boolean
  developer?: string
  extra?: ExtraInfo
  folder_name?: string
  install: Partial<InstalledInfo>
  installable?: boolean
  is_installed: boolean
  namespace?: string
  // NOTE: This is the save folder without any variables filled in...
  save_folder?: string
  // ...and this is the folder with them filled in
  save_path?: string
  gog_save_location?: GOGCloudSavesLocation[]
  title: string
  canRunOffline: boolean
  thirdPartyManagedApp?: string
  isEAManaged?: boolean
  is_mac_native?: boolean
  is_linux_native?: boolean
  browserUrl?: string
  description?: string
  //used for store release versions. if remote !== local, then update
  version?: string
  dlcList?: GameMetadataInner[]
  customUserAgent?: string
  launchFullScreen?: boolean
}

export interface GameSettings {
  autoInstallDxvk: boolean
  autoInstallVkd3d: boolean
  autoInstallDxvkNvapi: boolean
  autoSyncSaves: boolean
  battlEyeRuntime: boolean
  DXVKFpsCap: string //Entered as string but used as number
  eacRuntime: boolean
  enableDXVKFpsLimit: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableMsync: boolean
  enableFsync: boolean
  gamescope: GameScopeSettings
  enviromentOptions: EnviromentVariable[]
  ignoreGameUpdates: boolean
  language: string
  launcherArgs: string
  maxSharpness?: number
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions?: string //deprecated
  preferSystemLibs: boolean
  showFps: boolean
  showMangohud: boolean
  targetExe: string
  useGameMode: boolean
  useSteamRuntime: boolean
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
  wrapperOptions: WrapperVariable[]
  savesPath: string
  gogSaves?: GOGCloudSavesLocation[]
  beforeLaunchScriptPath: string
  afterLaunchScriptPath: string
}

export type Status =
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
  | 'syncing-saves'
  | 'notAvailable'
  | 'notSupportedGame'
  | 'notInstalled'
  | 'installed'
  | 'redist'
  | 'extracting'
  | 'winetricks'

export interface GameStatus {
  appName: string
  progress?: InstallProgress
  folder?: string
  context?: string // Additional context e.g current step
  runner?: Runner
  status: Status
}

export type GlobalConfigVersion = 'auto' | 'v0'
export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent?: number
  downSpeed?: number
  diskSpeed?: number
  file?: string
}
export interface InstalledInfo {
  executable: string
  install_path: string
  install_size: string
  is_dlc: boolean
  version: string
  platform: InstallPlatform
  appName?: string
  installedWithDLCs?: boolean // OLD DLC boolean (all dlcs installed)
  installedDLCs?: string[] // New installed GOG DLCs array
  language?: string // For GOG games
  versionEtag?: string // Checksum for checking GOG updates
  buildId?: string // For verifing and version pinning of GOG games
  branch?: string // GOG beta channels
  // Whether to skip update check for this title (currently only used for GOG as it is the only platform actively supporting version rollback)
  pinnedVersion?: boolean
  cyberpunk?: {
    // Cyberpunk compatibility options
    modsEnabled: boolean
    modsToLoad: string[] // If this is empty redmod will load mods in alphabetic order
  }
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
  type: 'wine' | 'proton' | 'crossover' | 'toolkit'
  lib?: string
  lib32?: string
  wineserver?: string
}

export interface InstallArgs {
  path: string
  platformToInstall: InstallPlatform
  installDlcs?: Array<string>
  sdlList?: string[]
  installLanguage?: string
  branch?: string
  build?: string
  dependencies?: string[]
}

export interface InstallParams extends InstallArgs {
  appName: string
  gameInfo: GameInfo
  runner: Runner
  size?: string
}

export interface UpdateParams {
  appName: string
  runner: Runner
  gameInfo: GameInfo
  installDlcs?: Array<string>
  installLanguage?: string
  build?: string
  branch?: string
}

export interface GOGLoginData {
  expires_in: number
  access_token: string
  refresh_token: string
  user_id: string
  loginTime: number
  error?: boolean
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
  dlcs: string[]
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
  type: 'sniper' | 'scout' | 'soldier'
  args: string[]
}

export interface LaunchPreperationResult {
  success: boolean
  failureReason?: string
  rpcClient?: RpcClient
  mangoHudCommand?: string[]
  gameModeBin?: string
  gameScopeCommand?: string[]
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
  logSanitizer?: (line: string) => string
  env?: Record<string, string> | NodeJS.ProcessEnv
  wrappers?: string[]
  onOutput?: (output: string, child: ChildProcess) => void
  abortId?: string
}

export interface EnviromentVariable {
  key: string
  value: string
}

export interface WrapperVariable {
  exe: string
  args: string
}

export interface WrapperEnv {
  appName: string
  appRunner: Runner
}

type AntiCheat =
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
  status: 'Broken' | 'Denied' | 'Working' | 'Running' | 'Supported'
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

export type RuntimeName = 'eac_runtime' | 'battleye_runtime' | 'umu'

export type RecentGame = {
  appName: string
  title: string
}

export type HiddenGame = RecentGame

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

export type InstallPlatform =
  | LegendaryInstallPlatform
  | GogInstallPlatform
  | NileInstallPlatform
  | 'Browser'

export type ConnectivityStatus = 'offline' | 'check-online' | 'online'

export interface Tools {
  exe?: string
  tool: string
  appName: string
  runner: Runner
}

export type DMStatus = 'done' | 'error' | 'abort' | 'paused'
export interface DMQueueElement {
  type: 'update' | 'install'
  params: InstallParams
  addToQueueTime: number
  startTime: number
  endTime: number
  status?: DMStatus
}

type ProtonVerb =
  | 'run'
  | 'waitforexitandrun'
  | 'runinprefix'
  | 'destroyprefix'
  | 'getcompatpath'
  | 'getnativepath'

export type WineCommandArgs = {
  commandParts: string[]
  wait?: boolean
  protonVerb?: ProtonVerb
  gameSettings?: GameSettings
  gameInstallPath?: string
  installFolderName?: string
  options?: CallRunnerOptions
  startFolder?: string
  skipPrefixCheckIKnowWhatImDoing?: boolean
  ignoreLogging?: boolean
}

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
  validFlatpakPath: boolean
}

export interface ToolArgs {
  appName: string
  action: 'backup' | 'restore'
}

export type StatusPromise = Promise<{ status: 'done' | 'error' | 'abort' }>

export interface GameScoreInfo {
  score: string
  urlid: string
}
export interface PCGamingWikiInfo {
  steamID: string
  howLongToBeatID: string
  metacritic: GameScoreInfo
  opencritic: GameScoreInfo
  igdb: GameScoreInfo
  direct3DVersions: string[]
  genres: string[]
  releaseDate: string[]
}

export interface AppleGamingWikiInfo {
  crossoverRating: string
  wineRating: string
  crossoverLink: string
}

export interface GamesDBInfo {
  steamID: string
}

export interface ProtonDBCompatibilityInfo {
  level: string
}

export interface SteamDeckComp {
  category: number
}

export interface SteamInfo {
  compatibilityLevel: string | null
  steamDeckCatagory: number | null
}

export interface WikiInfo {
  pcgamingwiki: PCGamingWikiInfo | null
  applegamingwiki: AppleGamingWikiInfo | null
  howlongtobeat: HowLongToBeatEntry | null
  gamesdb: GamesDBInfo | null
  steamInfo: SteamInfo | null
  umuId: string | null
}

/**
 * Defines from where the version comes
 */
export type Type =
  | 'Wine-GE'
  | 'Proton-GE'
  | 'Proton'
  | 'Wine-Lutris'
  | 'Wine-Kron4ek'
  | 'Wine-Crossover'
  | 'Wine-Staging-macOS'
  | 'Game-Porting-Toolkit'

/**
 * Interface contains information about a version
 * - version
 * - type (wine, proton, lutris, ge ...)
 * - date
 * - download link
 * - checksum link
 * - size (download and disk)
 */
export interface VersionInfo {
  version: string
  type: Type
  date: string
  download: string
  downsize: number
  disksize: number
  checksum: string
}

/**
 * Enum for the supported repositorys
 */
export enum Repositorys {
  WINEGE,
  PROTONGE,
  PROTON,
  WINELUTRIS,
  WINECROSSOVER,
  WINESTAGINGMACOS,
  GPTK
}

export type WineManagerStatus =
  | { status: 'idle' | 'unzipping' }
  | { status: 'downloading'; percentage: number; avgSpeed: number; eta: string }

export interface WineManagerUISettings {
  value: string
  type: Type
  enabled: boolean
}

export type DownloadManagerState = 'idle' | 'running' | 'paused' | 'stopped'

export interface WindowProps extends Electron.Rectangle {
  maximized: boolean
  frame?: boolean
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset'
  titleBarOverlay?: TitleBarOverlay | boolean
}

interface GameScopeSettings {
  enableUpscaling: boolean
  enableLimiter: boolean
  windowType: string
  gameWidth: string
  gameHeight: string
  upscaleWidth: string
  upscaleHeight: string
  upscaleMethod: string
  fpsLimiter: string
  fpsLimiterNoFocus: string
  additionalOptions: string
}

export type InstallInfo =
  | LegendaryInstallInfo
  | GogInstallInfo
  | NileInstallInfo

export interface KnowFixesInfo {
  title: string
  notes?: Record<string, string>
  winetricks?: string[]
  runInPrefix?: string[]
}

export interface UploadedLogData {
  // Descriptive name of the log file (e.g. "Game log of ...")
  name: string
  // Token to modify the file (used to delete the log file on the server)
  token: string
  // Time the log file was uploaded (used to know whether it expired)
  uploadedAt: number
}
