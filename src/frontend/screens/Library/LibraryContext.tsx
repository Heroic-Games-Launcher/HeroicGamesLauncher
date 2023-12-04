import React from 'react'

import { LibraryContextType } from 'frontend/types'

const initialContext: LibraryContextType = {
  storesFilters: { legendary: true, gog: true, nile: true, sideload: true },
  platformsFilters: { win: true, linux: true, mac: true, browser: true },
  filterText: '',
  toggleStoreFilter: () => null,
  handleLayout: () => null,
  togglePlatformFilter: () => null,
  handleSearch: () => null,
  layout: 'grid',
  showHidden: false,
  setShowHidden: () => null,
  showFavourites: false,
  setShowFavourites: () => null,
  showNonAvailable: false,
  setShowNonAvailable: () => null,
  showInstalledOnly: false,
  setShowInstalledOnly: () => null,
  sortDescending: true,
  setSortDescending: () => null,
  sortInstalled: true,
  setSortInstalled: () => null
}

export default React.createContext(initialContext)
