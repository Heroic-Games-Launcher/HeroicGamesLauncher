import React from 'react'

import { LibraryContextType } from 'frontend/types'

const initialContext: LibraryContextType = {
  category: 'all',
  filterText: '',
  filterPlatform: 'all',
  handleCategory: () => null,
  handleLayout: () => null,
  handlePlatformFilter: () => null,
  handleSearch: () => null,
  layout: 'grid',
  showHidden: false,
  setShowHidden: () => null,
  showFavourites: false,
  setShowNonAvailable: () => null,
  showNonAvailable: false,
  setShowFavourites: () => null
}

export default React.createContext(initialContext)
