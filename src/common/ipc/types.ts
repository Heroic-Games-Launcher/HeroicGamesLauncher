import type { OpenDialogOptions, TitleBarOverlay } from 'electron'

import {
  Runner,
  DiskSpaceData,
  Tools,
  WineCommandArgs,
  Release,
  GameInfo,
  GameSettings,
  InstallPlatform,
  UserInfo,
  WineInstallation,
  AppSettings,
  ToolArgs,
  LaunchParams,
  InstallParams,
  MoveGameArgs,
  ImportGameArgs,
  StatusPromise,
  SaveSyncArgs,
  RunWineCommandArgs,
  WineVersionInfo,
  AntiCheatInfo,
  RuntimeName,
  DMQueueElement,
  ConnectivityStatus,
  GamepadActionArgs,
  ExtraInfo,
  LaunchOption,
  DownloadManagerState,
  InstallInfo,
  ExecResult,
  WikiInfo,
  GameStatus,
  DialogType,
  ButtonOptions,
  RecentGame,
  WineManagerStatus,
  UpdateParams
} from 'common/types'
import type { GameOverride, SelectiveDownload } from 'common/types/legendary'
import type { GOGCloudSavesLocation, UserData } from 'common/types/gog'
import type {
  NileLoginData,
  NileRegisterData,
  NileUserData
} from 'common/types/nile'
import type { SystemInformation } from 'backend/utils/systeminfo'

/**
 * Some notes here:
 *  - One could've used arrays as keys for the `SyncIPCFunctions` interface
 *    (holding just the parameters to the callbacks, if any), since the callbacks
 *    there will never return anything other than void.
 *    I've decided against that to keep it in line with the `AsyncIPCFunctions`
 *    interface
 */
export interface SyncIPCFunctions {
  setZoomFactor: (zoomFactor: string) => void
  changeLanguage: (language: string) => void
  notify: (args: { title: string; body: string }) => void
  frontendReady: () => void
  lock: () => void
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
  openWinePrefixFAQ: () => void
  openWebviewPage: (url: string) => void
  openWikiLink: () => void
  openSidInfoPage: () => void
  openCustomThemesWiki: () => void
  showConfigFileInFolder: (appName: string) => void
  removeFolder: ([path, folderName]: [string, string]) => void
  clearCache: (showDialog?: boolean, fromVersionChange?: boolean) => void
  resetHeroic: () => void
  createNewWindow: (url: string) => void
  logoutGOG: () => void
  logError: (message: unknown) => void
  logInfo: (message: unknown) => void
  showItemInFolder: (item: string) => void
  clipboardWriteText: (text: string) => void
  processShortcut: (combination: string) => void
  addNewApp: (args: GameInfo) => void
  showLogFileInFolder: (appNameOrRunner: string) => void
  addShortcut: (appName: string, runner: Runner, fromMenu: boolean) => void
  removeShortcut: (appName: string, runner: Runner) => void
  removeFromDMQueue: (appName: string) => void
  clearDMFinished: () => void
  abort: (id: string) => void
  'connectivity-changed': (newStatus: ConnectivityStatus) => void
  'set-connectivity-online': () => void
  changeTrayColor: () => void
  setSetting: (args: { appName: string; key: string; value: unknown }) => void
  resumeCurrentDownload: () => void
  pauseCurrentDownload: () => void
  cancelDownload: (removeDownloaded: boolean) => void
  copySystemInfoToClipboard: () => void
  minimizeWindow: () => void
  maximizeWindow: () => void
  unmaximizeWindow: () => void
  closeWindow: () => void
  setTitleBarOverlay: (options: TitleBarOverlay) => void
  winetricksInstall: (
    appName: string,
    runner: Runner,
    component: string
  ) => void
  changeGameVersionPinnedStatus: (
    appName: string,
    runner: Runner,
    status: boolean
  ) => void
  install: (args: InstallParams) => void
  update: (args: UpdateParams) => void
}

export interface AsyncIPCFunctions {
  addToDMQueue: (element: DMQueueElement) => Promise<void>
  kill: (appName: string, runner: Runner) => Promise<void>
  checkDiskSpace: (folder: string) => Promise<DiskSpaceData>
  callTool: (args: Tools) => Promise<void>
  runWineCommand: (
    args: WineCommandArgs
  ) => Promise<{ stdout: string; stderr: string }>
  winetricksInstalled: (appName: string, runner: Runner) => Promise<string[]>
  winetricksAvailable: (appName: string, runner: Runner) => Promise<string[]>
  checkGameUpdates: () => Promise<string[]>
  getEpicGamesStatus: () => Promise<boolean>
  updateAll: () => Promise<({ status: 'done' | 'error' | 'abort' } | null)[]>
  getMaxCpus: () => number
  getHeroicVersion: () => string
  getLegendaryVersion: () => Promise<string>
  getGogdlVersion: () => Promise<string>
  getNileVersion: () => Promise<string>
  isFullscreen: () => boolean
  isFrameless: () => boolean
  isMaximized: () => boolean
  isMinimized: () => boolean
  isFlatpak: () => boolean
  showUpdateSetting: () => boolean
  getLatestReleases: () => Promise<Release[]>
  getCurrentChangelog: () => Promise<Release | null>
  getGameInfo: (appName: string, runner: Runner) => Promise<GameInfo | null>
  getExtraInfo: (appName: string, runner: Runner) => Promise<ExtraInfo | null>
  getGameSettings: (
    appName: string,
    runner: Runner
  ) => Promise<GameSettings | null>
  getGOGLinuxInstallersLangs: (appName: string) => Promise<string[]>
  getInstallInfo: (
    appName: string,
    runner: Runner,
    installPlatform: InstallPlatform,
    branch?: string,
    build?: string
  ) => Promise<InstallInfo | null>
  getUserInfo: () => Promise<UserInfo | undefined>
  getAmazonUserInfo: () => Promise<NileUserData | undefined>
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
  logoutLegendary: () => Promise<void>
  logoutAmazon: () => Promise<void>
  getAlternativeWine: () => Promise<WineInstallation[]>
  getLocalPeloadPath: () => Promise<string>
  readConfig: (config_class: 'library' | 'user') => Promise<GameInfo[] | string>
  requestAppSettings: () => AppSettings
  requestGameSettings: (appName: string) => Promise<GameSettings>
  writeConfig: (args: { appName: string; config: Partial<AppSettings> }) => void
  refreshLibrary: (library?: Runner | 'all') => Promise<void>
  launch: (args: LaunchParams) => StatusPromise
  openDialog: (args: OpenDialogOptions) => Promise<string | false>
  uninstall: (
    appName: string,
    runner: Runner,
    shouldRemovePrefix: boolean,
    shoudlRemoveSetting: boolean
  ) => Promise<void>
  repair: (appName: string, runner: Runner) => Promise<void>
  moveInstall: (args: MoveGameArgs) => Promise<void>
  importGame: (args: ImportGameArgs) => StatusPromise
  changeInstallPath: (args: MoveGameArgs) => Promise<void>
  egsSync: (arg: string) => Promise<string>
  syncGOGSaves: (
    gogSaves: GOGCloudSavesLocation[],
    appname: string,
    arg: string
  ) => Promise<string>
  syncSaves: (args: SaveSyncArgs) => Promise<string>
  gamepadAction: (args: GamepadActionArgs) => Promise<void>
  getFonts: (reload: boolean) => Promise<string[]>
  runWineCommandForGame: (args: RunWineCommandArgs) => Promise<ExecResult>
  getShellPath: (path: string) => Promise<string>
  clipboardReadText: () => string
  getCustomThemes: () => Promise<string[]>
  getThemeCSS: (theme: string) => Promise<string>
  removeApp: (args: {
    appName: string
    shouldRemovePrefix: boolean
    runner: Runner
  }) => Promise<void>
  isNative: (args: { appName: string; runner: Runner }) => boolean
  getLogContent: (appNameOrRunner: string) => string
  installWineVersion: (release: WineVersionInfo) => Promise<void>
  refreshWineVersionInfo: (fetch?: boolean) => Promise<void>
  removeWineVersion: (release: WineVersionInfo) => Promise<void>
  shortcutsExists: (appName: string, runner: Runner) => boolean
  addToSteam: (appName: string, runner: Runner) => Promise<boolean>
  removeFromSteam: (appName: string, runner: Runner) => Promise<void>
  isAddedToSteam: (appName: string, runner: Runner) => Promise<boolean>
  getAnticheatInfo: (appNamespace: string) => AntiCheatInfo | null
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
    appName: string
  ) => Promise<{ wasEnabled: boolean; installNow?: boolean }>
  disableEosOverlay: (appName: string) => Promise<void>
  isEosOverlayEnabled: (appName?: string) => Promise<boolean>
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
  removeRecent: (appName: string) => Promise<void>
  getWikiGameInfo: (
    title: string,
    appName: string,
    runner: Runner
  ) => Promise<WikiInfo | null>
  getDefaultSavePath: (
    appName: string,
    runner: Runner,
    alreadyDefinedGogSaves?: GOGCloudSavesLocation[]
  ) => Promise<string | GOGCloudSavesLocation[]>
  isGameAvailable: (args: {
    appName: string
    runner: Runner
  }) => Promise<boolean>
  toggleDXVK: (args: ToolArgs) => Promise<boolean>
  toggleVKD3D: (args: ToolArgs) => Promise<boolean>
  toggleDXVKNVAPI: (args: ToolArgs) => Promise<boolean>
  pathExists: (path: string) => Promise<boolean>
  getLaunchOptions: (appName: string, runner: Runner) => Promise<LaunchOption[]>
  getGameOverride: () => Promise<GameOverride>
  getGameSdl: (appName: string) => Promise<SelectiveDownload[]>
  getPlaytimeFromRunner: (
    runner: Runner,
    appName: string
  ) => Promise<number | undefined>
  getAmazonLoginData: () => Promise<NileLoginData>
  hasExecutable: (executable: string) => Promise<boolean>

  setPrivateBranchPassword: (appName: string, password: string) => void
  getPrivateBranchPassword: (appName: string) => string

  getAvailableCyberpunkMods: () => Promise<string[]>
  setCyberpunkModConfig: (props: {
    enabled: boolean
    modsToLoad: string[]
  }) => Promise<void>
}

export interface FrontendMessages {
  gameStatusUpdate: (status: GameStatus) => void
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
  launchGame: (appName: string, runner: Runner) => void
  installGame: (appName: string, runner: Runner) => void
  recentGamesChanged: (newRecentGames: RecentGame[]) => void
  pushGameToLibrary: (info: GameInfo) => void
  progressOfWinetricks: (payload: {
    messages: string[]
    installingComponent: string
  }) => void
  progressOfWineManager: (version: string, progress: WineManagerStatus) => void
  'installing-winetricks-component': (component: string) => void

  progressUpdate: (progress: GameStatus) => void

  // Used inside tests, so we can be a bit lenient with the type checking here
  message: (...params: unknown[]) => void
}
