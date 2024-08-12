import React from 'react'

import { GameContextType } from 'frontend/types'

const initialContext: GameContextType = {
  appName: 'default',
  runner: 'legendary',
  gameInfo: null,
  gameExtraInfo: null,
  gameSettings: null,
  gameInstallInfo: null,
  is: {
    installing: false,
    installingWinetricksPackages: false,
    installingRedist: false,
    launching: false,
    linuxNative: false,
    macNative: false,
    native: false,
    moving: false,
    notAvailable: false,
    notInstallable: false,
    notSupportedGame: false,
    playing: false,
    queued: false,
    reparing: false,
    sideloaded: false,
    syncing: false,
    uninstalling: false,
    updating: false
  },
  status: undefined,
  wikiInfo: null
}

export default React.createContext(initialContext)
