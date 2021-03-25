import { ContextType } from '../types'
import React from 'react'

const { remote } = window.require('electron')
const { process } = remote

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
  platform: process.platform,
  refresh: () => Promise.resolve(),
  refreshLibrary: () => Promise.resolve(),
  refreshing: false,
  user: ''
}

export default React.createContext(initialContext)
