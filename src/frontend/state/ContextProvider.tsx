import React from 'react'

import { ContextType } from 'frontend/types'

const initialContext: ContextType = {
  category: 'legendary',
  epic: {
    library: [],
    username: null,
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  gog: {
    library: [],
    username: null,
    login: async () => Promise.resolve(''),
    logout: async () => Promise.resolve()
  },
  wineVersions: [],
  error: false,
  filterText: '',
  filterPlatform: 'all',
  gameUpdates: [],
  handleCategory: () => null,
  handleGameStatus: async () => Promise.resolve(),
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
  setShowFavourites: () => null,
  favouriteGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  theme: 'default',
  setTheme: () => null,
  zoomPercent: 100,
  setZoomPercent: () => null,
  contentFontFamily: "'Cabin', sans-serif",
  setContentFontFamily: () => null,
  actionsFontFamily: "'Rubik', sans-serif",
  setActionsFontFamily: () => null,
  allTilesInColor: false,
  setAllTilesInColor: () => null,
  sidebarCollapsed: false,
  setSideBarCollapsed: () => null,
  activeController: ''
}

export default React.createContext(initialContext)
