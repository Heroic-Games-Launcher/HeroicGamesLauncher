import React from 'react'

import { LibraryContextType } from 'frontend/types'

const initialContext: LibraryContextType = {
  storesFilters: { legendary: true, gog: true, nile: true, sideload: true },
  platformsFilters: { win: true, linux: true, mac: true, browser: true },
  filterText: '',
  setStoresFilters: () => null,
  handleLayout: () => null,
  setPlatformsFilters: () => null,
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
  setSortInstalled: () => null,
  showSupportOfflineOnly: false,
  setShowSupportOfflineOnly: () => null,
  handleAddGameButtonClick: () => null,
  setShowCategories: () => null
}

export default React.createContext(initialContext)
