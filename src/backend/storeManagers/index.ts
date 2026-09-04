import SideloadLibraryManager from 'backend/storeManagers/sideload/library'
import GOGLibraryManager from 'backend/storeManagers/gog/library'
import LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import NileLibraryManager from 'backend/storeManagers/nile/library'
import ZoomLibraryManager from 'backend/storeManagers/zoom/library'
import SteamLibraryManager from 'backend/storeManagers/steam/library'

import { logInfo, RunnerToLogPrefixMap } from 'backend/logger'
import {
  addToQueue,
  getQueueInformation
} from 'backend/downloadmanager/downloadqueue'

import type { DMQueueElement, Runner } from 'common/types'
import { Game, LibraryManager } from 'common/types/game_manager'
import { getGame } from '../utils'

export const libraryManagerMap = {
  sideload: new SideloadLibraryManager(),
  gog: new GOGLibraryManager(),
  legendary: new LegendaryLibraryManager(),
  nile: new NileLibraryManager(),
  zoom: new ZoomLibraryManager(),
  steam: new SteamLibraryManager()
} satisfies Record<Runner, LibraryManager>

function getDMElement(game: Game) {
  const gameInfo = game.getGameInfo()
  const {
    install: { install_path, platform }
  } = gameInfo
  const dmQueueElement: DMQueueElement = {
    params: {
      appName: game.id,
      gameInfo,
      runner: game.runner,
      path: install_path!,
      platformToInstall: platform!
    },
    type: 'update',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }
  return dmQueueElement
}

export function autoUpdate(runner: Runner, gamesToUpdate: string[]) {
  const logPrefix = RunnerToLogPrefixMap[runner]
  // Runners report updateable until the update finishes,
  // so a mid-download check re-queues the game.
  // Index 0 holds the running element.
  const { elements: queued } = getQueueInformation()
  const alreadyQueued = (appName: string) =>
    queued.some(
      (element) =>
        element.params.appName === appName && element.params.runner === runner
    )

  gamesToUpdate.forEach(async (appName) => {
    if (alreadyQueued(appName)) {
      logInfo(`${appName} is already in the download queue`, logPrefix)
      return
    }
    const game = getGame(appName, runner)
    const { ignoreGameUpdates } = await game.getSettings()
    const gameInfo = game.getGameInfo()
    const gameIsAvailable = await game.isGameAvailable()
    if (!ignoreGameUpdates && gameIsAvailable) {
      logInfo(`Auto-Updating ${gameInfo.title}`, logPrefix)
      const dmQueueElement: DMQueueElement = getDMElement(game)
      addToQueue(dmQueueElement)
      // remove from the array to avoid downloading the same game twice
      gamesToUpdate = gamesToUpdate.filter((game) => game !== appName)
    } else {
      logInfo(`Skipping auto-update for ${gameInfo.title}`, logPrefix)
    }
  })
  return gamesToUpdate
}

export async function initStoreManagers() {
  return Promise.all(
    Object.values(libraryManagerMap).map((manager) => manager.init())
  )
}
