import { VersionInfo } from 'heroic-wine-downloader'
import {
  AppSettings,
  GameInfo,
  GameSettings,
  GameStatus,
  Runner,
  ConnectivityStatus,
  DialogType,
  ButtonOptions,
  LibraryTopSectionOptions,
  DMQueueElement
} from 'common/types'

export type Category = 'all' | 'legendary' | 'gog' | 'sideload'

export interface ContextType {
  category: Category
  wineVersions: WineVersionInfo[]
  error: boolean
  filterText: string
  filterPlatform: string
  gameUpdates: string[]
  isRTL: boolean
  language: string
  setLanguage: (newLanguage: string) => void
  handleCategory: (value: Category) => void
  handlePlatformFilter: (value: string) => void
  handleGameStatus: (game: GameStatus) => Promise<void>
  handleLayout: (value: string) => void
  handleSearch: (input: string) => void
  layout: string
  libraryStatus: GameStatus[]
  libraryTopSection: string
  handleLibraryTopSection: (value: LibraryTopSectionOptions) => void
  platform: NodeJS.Platform | 'unknown'
  refresh: (library: Runner, checkUpdates?: boolean) => Promise<void>
  refreshLibrary: (options: RefreshOptions) => Promise<void>
  refreshWineVersionInfo: (fetch: boolean) => void
  refreshing: boolean
  refreshingInTheBackground: boolean
  hiddenGames: {
    list: HiddenGame[]
    add: (appNameToHide: string, appTitle: string) => void
    remove: (appNameToUnhide: string) => void
  }
  favouriteGames: {
    list: HiddenGame[]
    add: (appNameToAdd: string, appTitle: string) => void
    remove: (appNameToRemove: string) => void
  }
  showHidden: boolean
  setShowHidden: (value: boolean) => void
  showFavourites: boolean
  setShowFavourites: (value: boolean) => void
  theme: string
  setTheme: (themeName: string) => void
  zoomPercent: number
  setZoomPercent: (newZoomPercent: number) => void
  epic: {
    library: GameInfo[]
    username: string | null
    login: (sid: string) => Promise<string>
    logout: () => Promise<void>
  }
  gog: {
    library: GameInfo[]
    username: string | null
    login: (token: string) => Promise<string>
    logout: () => Promise<void>
  }
  allTilesInColor: boolean
  setAllTilesInColor: (value: boolean) => void
  setSideBarCollapsed: (value: boolean) => void
  sidebarCollapsed: boolean
  activeController: string
  connectivity: { status: ConnectivityStatus; retryIn: number }
  setSecondaryFontFamily: (newFontFamily: string, saveToFile?: boolean) => void
  setPrimaryFontFamily: (newFontFamily: string, saveToFile?: boolean) => void
  dialogModalOptions: DialogModalOptions
  showDialogModal: (options: DialogModalOptions) => void
  showResetDialog: () => void
  sideloadedLibrary: GameInfo[]
}

export type DialogModalOptions = {
  showDialog?: boolean
  title?: string
  message?: string
  buttons?: Array<ButtonOptions>
  type?: DialogType
}

export interface HiddenGame {
  appName: string
  title: string
}

export type FavouriteGame = HiddenGame

export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent: number
}

export type RefreshOptions = {
  checkForUpdates?: boolean
  fullRefresh?: boolean
  library?: Runner | 'all'
  runInBackground?: boolean
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

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

export type WebviewType = HTMLWebViewElement & ElWebview

export interface GamepadActionStatus {
  [key: string]: {
    triggeredAt: { [key: number]: number }
    repeatDelay: false | number
  }
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

declare global {
  interface Window {
    imageData: (
      src: string,
      canvas_width: number,
      canvas_height: number
    ) => Promise<string>
    setTheme: (themeClass: string) => void
  }
  interface WindowEventMap {
    'controller-changed': CustomEvent<{ controllerId: string }>
  }
}

export interface SettingsContextType {
  getSetting: (key: string) => unknown
  setSetting: (key: string, value: unknown) => void
  config: AppSettings | GameSettings | null
  isDefault: boolean
  appName: string
  runner: Runner
}

export interface LocationState {
  fromGameCard: boolean
  runner: Runner
  isLinuxNative: boolean
  isMacNative: boolean
}

export type DMQueue = {
  elements: DMQueueElement[]
  finished: DMQueueElement[]
}
