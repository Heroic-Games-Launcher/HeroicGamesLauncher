import {
  AppSettings,
  GameInfo,
  Runner,
  DialogType,
  ButtonOptions,
  DMQueueElement,
  DownloadManagerState,
  GameSettings,
  WikiInfo,
  ExtraInfo,
  Status,
  InstallInfo
} from 'common/types'

export type Category = 'all' | 'legendary' | 'gog' | 'sideload' | 'nile'

export type DialogModalOptions = {
  showDialog: boolean
  title?: string
  message?: string
  buttons?: Array<ButtonOptions>
  type?: DialogType
}

export interface ExternalLinkDialogOptions {
  showDialog: boolean
  linkCallback?: () => void
}

export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent: number
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

declare global {
  const platform: NodeJS.Platform

  interface Window {
    imageData: (
      src: string,
      canvas_width: number,
      canvas_height: number
    ) => Promise<string>
    isSteamDeckGameMode: boolean
    platform: NodeJS.Platform
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

export interface HelpItem {
  title: string
  content: JSX.Element
}

export type SettingsModalType = 'settings' | 'log' | 'category'

export type InstallModalOptions =
  | {
      show: false
      gameInfo?: undefined
      appName?: undefined
      runner?: undefined
    }
  | {
      show: true
      gameInfo: GameInfo | null
      appName: string
      runner: Runner
    }
