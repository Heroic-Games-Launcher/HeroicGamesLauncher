import React from 'react'
import { ContextType } from '../types'

const initialContext: ContextType = {
  user: '',
  data: [],
  installing: [],
  playing: [],
  refreshing: false,
  error: false,
  refresh: () => null,
  refreshLibrary: () => null,
  handleInstalling: () => null,
  handlePlaying: () => null,
  handleSearch: () => null,
  handleOnlyInstalled: () => null
}

export default React.createContext(initialContext)