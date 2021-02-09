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
  refresh: () => null,
  refreshLibrary: () => null,
  handleGameStatus: () => Promise.resolve(),
  handleSearch: () => null,
  handleFilter: () => null,
  handleLayout: () => null,
}

export default React.createContext(initialContext)
