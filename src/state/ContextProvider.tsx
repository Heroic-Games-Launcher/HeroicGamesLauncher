import { ContextType } from '../types'
import React from 'react'

const initialContext: ContextType = {
  data: [],
  error: false,
  filter: 'all',
  gameUpdates: [],
  handleFilter: () => null,
  handleGameStatus: () => Promise.resolve(),
  handleLayout: () => null,
  handleSearch: () => null,
  layout: 'grid',
  libraryStatus: [],
  refresh: () => Promise.resolve(),
  refreshLibrary: () => Promise.resolve(),
  refreshing: false,
  user: '',
}

export default React.createContext(initialContext)
