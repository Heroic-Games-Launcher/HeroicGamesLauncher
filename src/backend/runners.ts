import { GameManager, LibraryManager } from 'common/types/game_manager'

import * as SideloadGameManager from 'backend/storeManagers/sideload/games'
import * as SideloadLibraryManager from 'backend/storeManagers/sideload/library'
import * as GOGGameManager from 'backend/storeManagers/gog/games'
import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import * as LegendaryGameManager from 'backend/storeManagers/legendary/games'
import * as LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import * as NileGameManager from 'backend/storeManagers/nile/games'
import * as NileLibraryManager from 'backend/storeManagers/nile/library'

interface StoreBackendConfig {
  runner: 'legendary' | 'gog' | 'nile' | 'sideload'
}

export const runnerMap: {
  [key in StoreBackendConfig['runner']]: {
    store: string
    umu: { isSupported: boolean; storeName?: string }
    gamesDB: { isSupported: boolean }
    logPrefix: string
    library: LibraryManager
    gameManager: GameManager
  }
} = {
  legendary: {
    store: 'epic',
    umu: { isSupported: true, storeName: 'egs' },
    gamesDB: { isSupported: true },
    logPrefix: 'Legendary',
    library: LegendaryLibraryManager,
    gameManager: LegendaryGameManager
  },
  gog: {
    store: 'gog',
    umu: { isSupported: true, storeName: 'gog' },
    gamesDB: { isSupported: true },
    logPrefix: 'Gog',
    library: GOGLibraryManager,
    gameManager: GOGGameManager
  },
  nile: {
    store: 'amazon',
    umu: { isSupported: true, storeName: 'amazon' },
    gamesDB: { isSupported: true },
    logPrefix: 'Nile',
    library: NileLibraryManager,
    gameManager: NileGameManager
  },
  sideload: {
    store: 'sideload',
    umu: { isSupported: false },
    gamesDB: { isSupported: false },
    logPrefix: 'Sideload',
    library: SideloadLibraryManager,
    gameManager: SideloadGameManager
  }
}
