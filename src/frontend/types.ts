import {
  GameInfo,
  GameStatus,
  HiddenGame,
  RefreshOptions,
  Runner,
  WineVersionInfo
} from 'common/types'

export type Category = 'all' | 'legendary' | 'gog'

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
  platform: NodeJS.Platform | string
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
  contentFontFamily: string
  setContentFontFamily: (newFontFamily: string) => void
  actionsFontFamily: string
  setActionsFontFamily: (newFontFamily: string) => void
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
}

export type LibraryTopSectionOptions =
  | 'disabled'
  | 'recently_played'
  | 'recently_played_installed'
  | 'favourites'

export interface Path {
  path: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

declare global {
  interface WindowEventMap {
    'controller-changed': CustomEvent<{ controllerId: string }>
  }
}
