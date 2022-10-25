import { GameStatus } from 'common/types'
import { LibraryContextType } from 'frontend/types'
import React from 'react'

const initialContext: LibraryContextType = {
  gameStatusList: new Map<string, GameStatus>(),
  hasGameStatus: (appName) => {
    return {
      appName,
      status: 'done',
      folder: 'default',
      runner: 'legendary',
      progress: {
        bytes: '0.00MiB',
        eta: '00:00:00',
        percent: 0,
        folder: 'default'
      },
      previousProgress: {
        bytes: '0.00MiB',
        eta: '00:00:00',
        percent: 0,
        folder: 'default'
      }
    }
  },
  hasDownloads: () => false
}

const LibraryContext = React.createContext(initialContext)
export const LibraryProvider = LibraryContext.Provider
export default LibraryContext
