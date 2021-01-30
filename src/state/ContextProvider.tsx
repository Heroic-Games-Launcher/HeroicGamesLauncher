import React from 'react'
import { ContextType } from '../types'

const initialContext: ContextType = {
  user: '',
  data: [],
  libraryStatus: [],
  refreshing: false,
  filter: 'all',
  error: false,
  refresh: () => null,
  refreshLibrary: () => null,
  handleGameStatus: () => null,
  handleSearch: () => null,
  handleFilter: () => null,
}

export default React.createContext(initialContext)
