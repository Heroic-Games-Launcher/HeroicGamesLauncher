import React from 'react'

import { ContextType } from 'src/types'

const initialContext: ContextType = {
  category: 'games',
  data: [],
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
  refreshing: false,
  isRTL: false
}

export default React.createContext(initialContext)
