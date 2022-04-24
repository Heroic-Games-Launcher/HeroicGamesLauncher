import React from 'react'

import { ContextType } from 'src/types'

const initialContext: ContextType = {
  category: 'epic',
  epicLibrary: [],
  gogLibrary: [],
  wineVersions: [],
  error: false,
  filter: 'all',
  filterText: '',
  filterPlatform: 'all',
  gameUpdates: [],
  handleCategory: () => null,
  handleFilter: () => null,
  handleGameStatus: () => Promise.resolve(),
  handleLayout: () => null,
  handlePlatformFilter: () => null,
  handleSearch: () => null,
  layout: 'grid',
  libraryStatus: [],
  platform: 'unknown',
  refresh: () => Promise.resolve(),
  recentGames: [],
  refreshLibrary: () => Promise.resolve(),
  refreshWineVersionInfo: () => Promise.resolve(),
  refreshing: false,
  isRTL: false,
  hiddenGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  showHidden: false,
  setShowHidden: () => null
}

export default React.createContext(initialContext)
