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
  DownloadManagerState,
  ExperimentalFeatures,
  GameSettings,
  WikiInfo,
  ExtraInfo,
  Status,
  InstallInfo
} from 'common/types'
import { NileLoginData, NileRegisterData } from 'common/types/nile'

export type Category = 'all' | 'legendary' | 'gog' | 'sideload' | 'nile'

export interface ContextType {
  error: boolean
  gameUpdates: string[]
  isRTL: boolean
  isFullscreen: boolean
  isFrameless: boolean
  language: string
  setLanguage: (newLanguage: string) => void
  libraryStatus: GameStatus[]
  libraryTopSection: string
  handleLibraryTopSection: (value: LibraryTopSectionOptions) => void
  platform: NodeJS.Platform | 'unknown'
  isIntelMac: boolean
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
  customCategories: {
    list: Record<string, string[]>
    listCategories: () => string[]
    addToGame: (category: string, appName: string) => void
    removeFromGame: (category: string, appName: string) => void
    addCategory: (newCategory: string) => void
    removeCategory: (category: string) => void
    renameCategory: (oldName: string, newName: string) => void
  }
  currentCustomCategories: string[]
  setCurrentCustomCategories: (newCustomCategories: string[]) => void
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
    user_id?: string
    username?: string
    getLoginData: () => Promise<NileLoginData>
    login: (data: NileRegisterData) => Promise<string>
    logout: () => Promise<void>
  }
  installingEpicGame: boolean
  allTilesInColor: boolean
  setAllTilesInColor: (value: boolean) => void
  titlesAlwaysVisible: boolean
  setTitlesAlwaysVisible: (value: boolean) => void
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
  help: {
    items: { [key: string]: HelpItem }
    addHelpItem: (helpItemId: string, helpItem: HelpItem) => void
    removeHelpItem: (helpItemId: string) => void
  }
  experimentalFeatures: ExperimentalFeatures
  handleExperimentalFeatures: (newSetting: ExperimentalFeatures) => void
  disableDialogBackdropClose: boolean
  setDisableDialogBackdropClose: (value: boolean) => void
}

export type DialogModalOptions = {
  showDialog?: boolean
  title?: string
  message?: string | React.ReactElement
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
    isSteamDeckGameMode: boolean
    platform: NodeJS.Platform
    setCustomCSS: (cssString: string) => void
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
  runner?: Runner
  gameInfo?: GameInfo
  isMacNative: boolean
  isLinuxNative: boolean
}

export interface StoresFilters {
  legendary: boolean
  gog: boolean
  nile: boolean
  sideload: boolean
}

export interface PlatformsFilters {
  win: boolean
  linux: boolean
  mac: boolean
  browser: boolean
}

export interface LibraryContextType {
  storesFilters: StoresFilters
  platformsFilters: PlatformsFilters
  filterText: string
  setStoresFilters: (filters: StoresFilters) => void
  setPlatformsFilters: (filters: PlatformsFilters) => void
  handleLayout: (value: string) => void
  handleSearch: (input: string) => void
  layout: string
  showHidden: boolean
  setShowHidden: (value: boolean) => void
  showFavourites: boolean
  setShowFavourites: (value: boolean) => void
  showInstalledOnly: boolean
  setShowInstalledOnly: (value: boolean) => void
  showNonAvailable: boolean
  setShowNonAvailable: (value: boolean) => void
  sortDescending: boolean
  setSortDescending: (value: boolean) => void
  sortInstalled: boolean
  setSortInstalled: (value: boolean) => void
  showSupportOfflineOnly: boolean
  setShowSupportOfflineOnly: (value: boolean) => void
  showThirdPartyManagedOnly: boolean
  setShowThirdPartyManagedOnly: (value: boolean) => void
  handleAddGameButtonClick: () => void
  setShowCategories: (value: boolean) => void
}

export interface GameContextType {
  appName: string
  runner: Runner
  gameInfo: GameInfo | null
  gameExtraInfo: ExtraInfo | null
  gameSettings: GameSettings | null
  gameInstallInfo: InstallInfo | null
  is: {
    installing: boolean
    installingWinetricksPackages: boolean
    installingRedist: boolean
    launching: boolean
    linux: boolean
    linuxNative: boolean
    mac: boolean
    macNative: boolean
    moving: boolean
    native: boolean
    notAvailable: boolean
    notInstallable: boolean
    notSupportedGame: boolean
    playing: boolean
    queued: boolean
    reparing: boolean
    sideloaded: boolean
    syncing: boolean
    uninstalling: boolean
    updating: boolean
    win: boolean
  }
  statusContext?: string
  status: Status | undefined
  wikiInfo: WikiInfo | null
}

export type DMQueue = {
  elements: DMQueueElement[]
  finished: DMQueueElement[]
  state: DownloadManagerState
}

export interface HelpItem {
  title: string
  content: JSX.Element
}
