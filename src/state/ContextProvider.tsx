import React from 'react'

import { ContextType } from 'src/types'

const initialContext: ContextType = {
  category: 'epic',
  epic: {
    library: [],
    username: null,
    login: async () => Promise.resolve(''),
    logout: () => null
  },
  gog: {
    library: [],
    username: null,
    login: async () => Promise.resolve(''),
    logout: () => null
  },
  wineVersions: [],
  error: false,
  filter: 'all',
  filterText: '',
  filterPlatform: 'all',
  gameUpdates: [],
  handleCategory: () => null,
  handleFilter: () => null,
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
  recentGames: [],
  refreshLibrary: async () => Promise.resolve(),
  refreshWineVersionInfo: async () => Promise.resolve(),
  refreshing: false,
  isRTL: false,
  hiddenGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  showHidden: false,
  setShowHidden: () => null,
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
  setAllTilesInColor: () => null
}

export default React.createContext(initialContext)
