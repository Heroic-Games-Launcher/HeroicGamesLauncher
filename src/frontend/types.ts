import {
  AppSettings,
  GameInfo,
  GameStatus,
  Runner,
  ConnectivityStatus,
  DialogType,
  ButtonOptions,
  LibraryTopSectionOptions,
  DMQueueElement,
  DownloadManagerState
} from 'common/types'
import { NileLoginData, NileRegisterData } from 'common/types/nile'

export type Category = 'all' | 'legendary' | 'gog' | 'sideload' | 'nile'

export interface ContextType {
  category: Category
  error: boolean
  filterText: string
  filterPlatform: string
  gameUpdates: string[]
  isRTL: boolean
  language: string
  setLanguage: (newLanguage: string) => void
  handleCategory: (value: Category) => void
  handlePlatformFilter: (value: string) => void
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
  showNonAvailable: boolean
  setShowNonAvailable: (value: boolean) => void
  theme: string
  setTheme: (themeName: string) => void
  zoomPercent: number
  setZoomPercent: (newZoomPercent: number) => void
  epic: {
    library: GameInfo[]
    username?: string
    login: (sid: string) => Promise<string>
    logout: () => Promise<void>
  }
  gog: {
    library: GameInfo[]
    username?: string
    login: (token: string) => Promise<string>
    logout: () => Promise<void>
  }
  amazon: {
    library: GameInfo[]
    username?: string
    getLoginData: () => Promise<NileLoginData>
    login: (data: NileRegisterData) => Promise<string>
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
  externalLinkDialogOptions: ExternalLinkDialogOptions
  handleExternalLinkDialog: (options: ExternalLinkDialogOptions) => void
  sideloadedLibrary: GameInfo[]
  hideChangelogsOnStartup: boolean
  setHideChangelogsOnStartup: (value: boolean) => void
  lastChangelogShown: string | null
  setLastChangelogShown: (value: string) => void
  isSettingsModalOpen: {
    value: boolean
    gameInfo?: GameInfo | null
    type: 'settings' | 'log'
  }
  setIsSettingsModalOpen: (
    value: boolean,
    type?: 'settings' | 'log',
    gameInfo?: GameInfo
  ) => void
}

export type DialogModalOptions = {
  showDialog?: boolean
  title?: string
  message?: string
  buttons?: Array<ButtonOptions>
  type?: DialogType
}

export interface ExternalLinkDialogOptions {
  showDialog: boolean
  linkCallback?: () => void
}

interface HiddenGame {
  appName: string
  title: string
}

export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent: number
}

type RefreshOptions = {
  checkForUpdates?: boolean
  fullRefresh?: boolean
  library?: Runner | 'all'
  runInBackground?: boolean
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

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
    'visible-cards': CustomEvent<{ appNames: string[] }>
    'controller-changed': CustomEvent<{ controllerId: string }>
  }
}

export interface SettingsContextType {
  getSetting: <T extends keyof AppSettings>(
    key: T,
    fallback: NonNullable<AppSettings[T]>
  ) => NonNullable<AppSettings[T]>
  setSetting: <T extends keyof AppSettings>(
    key: T,
    value: AppSettings[T]
  ) => void
  config: Partial<AppSettings>
  isDefault: boolean
  appName: string
  runner: Runner
  gameInfo: GameInfo | null
  isMacNative: boolean
  isLinuxNative: boolean
}

export interface LocationState {
  fromGameCard: boolean
  runner: Runner
  isLinuxNative: boolean
  isMacNative: boolean
  gameInfo: GameInfo
}

export type DMQueue = {
  elements: DMQueueElement[]
  finished: DMQueueElement[]
  state: DownloadManagerState
}
