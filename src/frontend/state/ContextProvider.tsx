import React from 'react'

import { ContextType } from 'frontend/types'

const initialContext: ContextType = {
  category: 'all',
  epic: {
    library: [],
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  gog: {
    library: [],
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  amazon: {
    library: [],
    getLoginData: async () =>
      Promise.resolve({
        client_id: '',
        code_verifier: '',
        serial: '',
        url: ''
      }),
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  sideloadedLibrary: [],
  error: false,
  filterText: '',
  filterPlatform: 'all',
  gameUpdates: [],
  handleCategory: () => null,
  handleLayout: () => null,
  handlePlatformFilter: () => null,
  handleSearch: () => null,
  layout: 'grid',
  libraryStatus: [],
  libraryTopSection: 'disabled',
  handleLibraryTopSection: () => null,
  platform: 'unknown',
  refresh: async () => Promise.resolve(),
  refreshLibrary: async () => Promise.resolve(),
  refreshWineVersionInfo: async () => Promise.resolve(),
  refreshing: false,
  refreshingInTheBackground: true,
  isRTL: false,
  language: 'en',
  setLanguage: () => null,
  hiddenGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  showHidden: false,
  setShowHidden: () => null,
  showFavourites: false,
  setShowNonAvailable: () => null,
  showNonAvailable: false,
  setShowFavourites: () => null,
  favouriteGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  theme: 'midnightMirage',
  setTheme: () => null,
  zoomPercent: 100,
  setZoomPercent: () => null,
  allTilesInColor: false,
  setAllTilesInColor: () => null,
  sidebarCollapsed: false,
  setSideBarCollapsed: () => null,
  activeController: '',
  connectivity: { status: 'online', retryIn: 0 },
  setPrimaryFontFamily: () => null,
  setSecondaryFontFamily: () => null,
  dialogModalOptions: { showDialog: false },
  showDialogModal: () => null,
  showResetDialog: () => null,
  externalLinkDialogOptions: { showDialog: false },
  handleExternalLinkDialog: () => null,
  hideChangelogsOnStartup: false,
  setHideChangelogsOnStartup: () => null,
  lastChangelogShown: null,
  setLastChangelogShown: () => null,
  isSettingsModalOpen: { value: false, type: 'settings' },
  setIsSettingsModalOpen: () => null
}

export default React.createContext(initialContext)
