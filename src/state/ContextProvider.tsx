import React from 'react'
import { ContextType } from '../types'

const initialContext: ContextType = {
  user: '',
  data: [],
  libraryStatus: [],
  refreshing: false,
  filter: 'all',
  layout: 'grid',
  error: false,
  gameUpdates: [],
  gamepadConnected: false,
  refresh: () => Promise.resolve(),
  refreshLibrary: () => Promise.resolve(),
  handleGameStatus: () => Promise.resolve(),
  handleSearch: () => null,
  handleFilter: () => null,
  handleLayout: () => null,
  handleGamepad: () => null,
}

export default React.createContext(initialContext)
