import type { OpenDialogOptions, TitleBarOverlay } from 'electron'

import type { SystemInformation } from 'backend/utils/systeminfo'

import type {
  AntiCheatInfo,
  AppSettings,
  ButtonOptions,
  ConnectivityStatus,
  DialogType,
  DiskSpaceData,
  DMQueueElement,
  DownloadManagerState,
  ExecResult,
  ExtraInfo,
  GameAchievement,
  GameInfo,
  GamepadActionArgs,
  GameSettings,
  GameStatus,
  ImportGameArgs,
  InstallInfo,
  InstallParams,
  InstallPlatform,
  KnowFixesInfo,
  LaunchOption,
  LaunchParams,
  RecentGame,
  Release,
  Runner,
  RunnerCommandStub,
  RuntimeName,
  StatusPromise,
  UpdateParams,
  UploadedLogData,
  UserInfo,
  WikiInfo,
  WineCommandArgs,
  WineInstallation,
  WineManagerStatus,
  WineVersionInfo
} from '../types'
import type { CatalogLocaleSettings, CatalogProduct } from './discounts'
import type { GOGCloudSavesLocation, UserData } from './gog'
import type { NileLoginData, NileRegisterData, NileUserData } from './nile'
import type { GameOverride, SelectiveDownload } from './legendary'
import type { GetLogFileArgs } from 'backend/logger/paths'
import type { Game } from './game_manager'
import type { GameHandle } from 'frontend/helpers/ipc'
import type { GameMetadataOverride } from 'backend/game_overrides/electronStores'

// ts-prune-ignore-next
interface SyncIPCFunctions {
  setZoomFactor: (zoomFactor: string) => void
  changeLanguage: (language: string) => void
  notify: (args: { title: string; body: string }) => void
  frontendReady: () => void
  lock: (playing: boolean) => void
  unlock: () => void
  quit: () => void
  openExternalUrl: (url: string) => void
  openFolder: (folder: string) => void
  openSupportPage: () => void
  openReleases: () => void
  openWeblate: () => void
  showAboutWindow: () => void
  openLoginPage: () => void
  openDiscordLink: () => void
  openPatreonPage: () => void
  openKofiPage: () => void
  openGithubSponsorsPage: () => void
  openWinePrefixFAQ: () => void
  openWebviewPage: (url: string) => void
  openWikiLink: () => void
  openSidInfoPage: () => void
  openCustomThemesWiki: () => void
  showConfigFileInFolder: (game?: Game) => void
  removeFolder: ([path, folderName]: [string, string]) => void
  clearCache: (showDialog?: boolean, fromVersionChange?: boolean) => void
  clearAchievementCache: (game: Game) => void
  resetHeroic: () => void
  createNewWindow: (url: string) => void
  logoutGOG: () => void
  logError: (message: unknown) => void
  logInfo: (message: unknown) => void
  showItemInFolder: (item: string) => void
  clipboardWriteText: (text: string) => void
  processShortcut: (combination: string) => void
  addNewApp: (args: GameInfo) => void
  showLogFileInFolder: (args: GetLogFileArgs) => void
  addShortcut: (game: Game, fromMenu: boolean) => void
  removeShortcut: (game: Game) => void
  removeFromDMQueue: (game: Game) => void
  clearDMFinished: () => void
  abort: (id: string) => void
  'connectivity-changed': (newStatus: ConnectivityStatus) => void
  'set-connectivity-online': () => void
  changeTrayColor: () => void
  setSetting: (
    game: Game | null,
    key: keyof AppSettings,
    value: unknown
  ) => void
  resumeCurrentDownload: () => void
  pauseCurrentDownload: () => void
  cancelDownload: (removeDownloaded: boolean) => void
  copySystemInfoToClipboard: () => void
  minimizeWindow: () => void
  maximizeWindow: () => void
  unmaximizeWindow: () => void
  closeWindow: () => void
  setFullscreen: (enabled: boolean) => void
  setTitleBarOverlay: (options: TitleBarOverlay) => void
  winetricksInstall: (game: Game, component: string) => void
  changeGameVersionPinnedStatus: (game: Game, status: boolean) => void
  logoutZoom: () => void
  setGameMetadataOverride: (game: Game, overrides: GameMetadataOverride) => void
}

/*
 * These events should only be used during tests to stub/mock
 *
 * We have to handle them in another interface because these
 * events don't have an IpcMainEvent first argument when handled
 */
interface TestSyncIPCFunctions {
  setLegendaryCommandStub: (stubs: RunnerCommandStub[]) => void
  resetLegendaryCommandStub: () => void
  setGogdlCommandStub: (stubs: RunnerCommandStub[]) => void
  resetGogdlCommandStub: () => void
  setNileCommandStub: (stubs: RunnerCommandStub[]) => void
  resetNileCommandStub: () => void
}

// ts-prune-ignore-next
interface AsyncIPCFunctions {
  kill: (game: Game) => Promise<void>
  checkDiskSpace: (folder: string) => Promise<DiskSpaceData>
  callTool: (game: Game, tool: string, exe?: string) => Promise<void>
  runWineCommand: (
    game: Game,
    args: WineCommandArgs
  ) => Promise<{ stdout: string; stderr: string }>
  winetricksInstalled: (game: Game) => Promise<string[]>
  winetricksAvailable: (game: Game) => Promise<string[]>
  checkGameUpdates: () => Promise<string[]>
  getEpicGamesStatus: () => Promise<boolean>
  updateAll: () => Promise<({ status: 'done' | 'error' | 'abort' } | null)[]>
  getMaxCpus: () => number
  getHeroicVersion: () => string
  getLegendaryVersion: () => Promise<string>
  getGogdlVersion: () => Promise<string>
  getCometVersion: () => Promise<string>
  getNileVersion: () => Promise<string>
  isFullscreen: () => boolean
  isFrameless: () => boolean
  isMaximized: () => boolean
  isMinimized: () => boolean
  showUpdateSetting: () => boolean
  getLatestReleases: () => Promise<Release[]>
  getCurrentChangelog: () => Promise<Release | null>
  getGameInfo: (game: Game) => Promise<GameInfo | null>
  getAchievements: (game: Game, lang?: string) => Promise<GameAchievement[]>
  getExtraInfo: (game: Game) => Promise<ExtraInfo | null>
  getGameSettings: (game: Game) => Promise<GameSettings | null>
  getGOGLinuxInstallersLangs: (game: Game) => Promise<string[]>
  getInstallInfo: (
    game: Game,
    installPlatform: InstallPlatform,
    branch?: string,
    build?: string
  ) => Promise<InstallInfo | null | undefined>
  getUserInfo: () => Promise<UserInfo | undefined>
  getAmazonUserInfo: () => Promise<NileUserData | undefined>
  getZoomUserInfo: () => Promise<{ username: string } | undefined>
  isLoggedIn: () => boolean
  login: (sid: string) => Promise<{
    status: 'done' | 'failed'
    data: UserInfo | undefined
  }>
  authGOG: (code: string) => Promise<{
    status: 'done' | 'error'
    data?: UserData
  }>
  authAmazon: (data: NileRegisterData) => Promise<{
    status: 'done' | 'failed'
    user: NileUserData | undefined
  }>
  authZoom: (url: string) => Promise<{ status: 'done' | 'error' }>
  logoutLegendary: () => Promise<void>
  logoutAmazon: () => Promise<void>
  getAlternativeWine: () => Promise<WineInstallation[]>
  readConfig: (config_class: 'library' | 'user') => Promise<GameInfo[] | string>
  requestAppSettings: () => AppSettings
  requestGameSettings: (game: Game) => Promise<GameSettings>
  writeConfig: (game: Game | null, config: Partial<AppSettings>) => void
  refreshLibrary: (library?: Runner | 'all') => Promise<void>
  launch: (game: Game, args: LaunchParams) => StatusPromise
  openDialog: (args: OpenDialogOptions) => Promise<string | false>
  install: (args: InstallParams) => Promise<void>
  uninstall: (
    game: Game,
    shouldRemovePrefix: boolean,
    shoudlRemoveSetting: boolean
  ) => Promise<void>
  repair: (game: Game) => Promise<void>
  moveInstall: (game: Game, path: string) => Promise<void>
  importGame: (game: Game, args: ImportGameArgs) => StatusPromise
  updateGame: (game: Game, args: UpdateParams) => Promise<void>
  changeInstallPath: (game: Game, path: string) => Promise<void>
  egsSync: (arg: string) => Promise<string>
  syncGOGSaves: (
    game: Game,
    gogSaves: GOGCloudSavesLocation[],
    arg: string
  ) => Promise<string>
  syncSaves: (
    game: Game,
    path: string,
    arg: string | undefined
  ) => Promise<string>
  gamepadAction: (args: GamepadActionArgs) => Promise<void>
  runWineCommandForGame: (
    game: Game,
    commandParts: string[]
  ) => Promise<ExecResult>
  getShellPath: (path: string) => Promise<string>
  getWebviewPreloadPath: () => string
  clipboardReadText: () => string
  getCustomThemes: () => Promise<string[]>
  getThemeCSS: (theme: string) => Promise<string>
  isNative: (game: Game) => boolean
  getLogContent: (args: GetLogFileArgs) => string
  installWineVersion: (release: WineVersionInfo) => Promise<void>
  refreshWineVersionInfo: (fetch?: boolean) => Promise<void>
  removeWineVersion: (release: WineVersionInfo) => Promise<void>
  'wine.isValidVersion': (release: WineInstallation) => Promise<boolean>
  shortcutsExists: (game: Game) => boolean
  addToSteam: (game: Game) => Promise<boolean>
  removeFromSteam: (game: Game) => Promise<void>
  isAddedToSteam: (game: Game) => Promise<boolean>
  getAnticheatInfo: (appNamespace: string) => Promise<AntiCheatInfo | null>
  getKnownFixes: (game: Game) => KnowFixesInfo | null
  getGameMetadataOverride: (game: Game) => Promise<GameMetadataOverride | null>
  getAllGameOverrides: () => Promise<Record<string, GameMetadataOverride>>
  getEosOverlayStatus: () => {
    isInstalled: boolean
    version?: string
    install_path?: string
  }
  getLatestEosOverlayVersion: () => Promise<string>
  updateEosOverlayInfo: () => Promise<void>
  installEosOverlay: () => Promise<string | undefined>
  removeEosOverlay: () => Promise<boolean>
  enableEosOverlay: (
    game?: Game
  ) => Promise<{ wasEnabled: boolean; installNow?: boolean }>
  disableEosOverlay: (game?: Game) => Promise<void>
  isEosOverlayEnabled: (game?: Game) => Promise<boolean>
  downloadRuntime: (runtime_name: RuntimeName) => Promise<boolean>
  isRuntimeInstalled: (runtime_name: RuntimeName) => Promise<boolean>
  getDMQueueInformation: () => {
    elements: DMQueueElement[]
    finished: DMQueueElement[]
    state: DownloadManagerState
  }
  'get-connectivity-status': () => {
    status: ConnectivityStatus
    retryIn: number
  }
  getSystemInfo: (cache?: boolean) => Promise<SystemInformation>
  removeRecent: (game: Game) => Promise<void>
  getWikiGameInfo: (game: Game) => Promise<WikiInfo | null>
  getDefaultSavePath: (
    game: Game,
    alreadyDefinedGogSaves: GOGCloudSavesLocation[]
  ) => Promise<string | GOGCloudSavesLocation[]>
  isGameAvailable: (game: Game) => Promise<boolean>
  toggleDXVK: (game: Game, action: 'backup' | 'restore') => Promise<boolean>
  toggleVKD3D: (game: Game, action: 'backup' | 'restore') => Promise<boolean>
  toggleDXVKNVAPI: (
    game: Game,
    action: 'backup' | 'restore'
  ) => Promise<boolean>
  pathExists: (path: string) => Promise<boolean>
  getLaunchOptions: (game: Game) => Promise<LaunchOption[]>
  getGameOverride: () => Promise<GameOverride>
  getGameSdl: (game: Game) => Promise<SelectiveDownload[]>
  getPlaytimeFromRunner: (game: Game) => Promise<number | undefined>
  getAmazonLoginData: () => Promise<NileLoginData>
  hasExecutable: (executable: string) => Promise<boolean>

  setPrivateBranchPassword: (game: Game, password: string) => void
  getPrivateBranchPassword: (game: Game) => string

  getAvailableCyberpunkMods: () => Promise<string[]>
  setCyberpunkModConfig: (props: {
    enabled: boolean
    modsToLoad: string[]
  }) => Promise<void>

  uploadLogFile: (
    name: string,
    args: GetLogFileArgs
  ) => Promise<false | [string, UploadedLogData]>
  deleteUploadedLogFile: (url: string) => Promise<boolean>
  getUploadedLogFiles: () => Promise<Record<string, UploadedLogData>>
  getCustomCSS: () => Promise<string>
  isIntelMac: () => boolean
  getGogDiscounts: (
    locale: CatalogLocaleSettings,
    hideOwned?: boolean,
    wishlistOnly?: boolean
  ) => Promise<CatalogProduct[]>
  'steamgriddb.hasApiKey': () => Promise<boolean>
  'steamgriddb.setApiKey': (key: string) => Promise<void>
  'steamgriddb.searchGame': (
    query: string
  ) => Promise<Array<{ id: number; name: string }>>
  'steamgriddb.getGrids': (args: {
    gameId: number
    styles?: string[]
    dimensions?: string[]
  }) => Promise<Array<{ id: number; url: string; thumb: string }>>
  'steamgriddb.getHeroes': (args: {
    gameId: number
    styles?: string[]
    dimensions?: string[]
  }) => Promise<Array<{ id: number; url: string; thumb: string }>>

  'game.supportsChangelogs': (game: Game) => boolean
  'game.getChangelog': (game: Game) => Promise<string | null>
}

interface FrontendEvent {
  gameStatusUpdate: (game: Game, status: GameStatus) => void
  wineVersionsUpdated: () => void
  showDialog: (
    title: string,
    message: string,
    type: DialogType,
    buttons?: Array<ButtonOptions>
  ) => void
  changedDMQueueInformation: (
    elements: DMQueueElement[],
    state: DownloadManagerState
  ) => void
  maximized: () => void
  unmaximized: () => void
  fullscreen: (status: boolean) => void
  refreshLibrary: (runner?: Runner) => void
  openScreen: (screen: string) => void
  'connectivity-changed': (status: {
    status: ConnectivityStatus
    retryIn: number
  }) => void
  launchGame: (game: Game, args: string[]) => void
  installGame: (game: Game) => void
  recentGamesChanged: (newRecentGames: RecentGame[]) => void
  pushGameToLibrary: (info: GameInfo) => void
  progressOfWinetricks: (payload: {
    messages: string[]
    installingComponent: string
  }) => void
  progressOfWineManager: (version: string, progress: WineManagerStatus) => void
  'installing-winetricks-component': (component: string) => void
  logFileUploaded: (url: string, data: UploadedLogData) => void
  logFileUploadDeleted: (url: string) => void
  progressUpdate: (game: Game, progress: GameStatus) => void
  metadataChanged: (
    overrides: Record<
      string,
      { title?: string; art_cover?: string; art_square?: string }
    >
  ) => void

  // Used inside tests, so we can be a bit lenient with the type checking here
  message: (...params: unknown[]) => void
}

// List of mappings of <backend type> to <frontend type>
// This is used to automatically transform from a backend representation of a
// thing to a frontend one. Taking the first entry as an example, it notes that
// wherever the Backend expects or returns a `Game`, the Frontend will instead
// use/get a `GameHandle` (the game's id & runner). The IPC system
// will automatically transform one type to the other
type ParameterMappings = [Game, GameHandle]

export type {
  SyncIPCFunctions,
  TestSyncIPCFunctions,
  AsyncIPCFunctions,
  FrontendEvent,
  ParameterMappings
}
