import SideloadGameManager from 'backend/storeManagers/sideload/games'
import GOGGameManager from 'backend/storeManagers/gog/games'
import LegendaryGameManager from 'backend/storeManagers/legendary/games'
import NileGameManager from 'backend/storeManagers/nile/games'
import ZoomGameManager from 'backend/storeManagers/zoom/games'

import SideloadLibraryManager from 'backend/storeManagers/sideload/library'
import GOGLibraryManager from 'backend/storeManagers/gog/library'
import LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import NileLibraryManager from 'backend/storeManagers/nile/library'
import ZoomLibraryManager from 'backend/storeManagers/zoom/library'

import { logInfo, RunnerToLogPrefixMap } from 'backend/logger'
import { addToQueue } from 'backend/downloadmanager/downloadqueue'

import type { DMQueueElement, GameInfo, Runner } from 'common/types'
import type { GameManager, LibraryManager } from 'common/types/game_manager'

export const gameManagerMap = {
  sideload: new SideloadGameManager(),
  gog: new GOGGameManager(),
  legendary: new LegendaryGameManager(),
  nile: new NileGameManager(),
  zoom: new ZoomGameManager()
} satisfies Record<Runner, GameManager>

export const libraryManagerMap = {
  sideload: new SideloadLibraryManager(),
  gog: new GOGLibraryManager(),
  legendary: new LegendaryLibraryManager(),
  nile: new NileLibraryManager(),
  zoom: new ZoomLibraryManager()
} satisfies Record<Runner, LibraryManager>

function getDMElement(gameInfo: GameInfo, appName: string) {
  const {
    install: { install_path, platform },
    runner
  } = gameInfo
  const dmQueueElement: DMQueueElement = {
    params: {
      appName,
      gameInfo,
      runner,
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
  gamesToUpdate.forEach(async (appName) => {
    const { ignoreGameUpdates } =
      await gameManagerMap[runner].getSettings(appName)
    const gameInfo = gameManagerMap[runner].getGameInfo(appName)
    const gameIsAvailable =
      await gameManagerMap[runner].isGameAvailable(appName)
    if (!ignoreGameUpdates && gameIsAvailable) {
      logInfo(`Auto-Updating ${gameInfo.title}`, logPrefix)
      const dmQueueElement: DMQueueElement = getDMElement(gameInfo, appName)
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
