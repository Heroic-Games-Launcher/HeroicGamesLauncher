import * as HyperPlayGameManager from 'backend/storeManagers/hyperplay/games'
import * as SideloadGameManager from 'backend/storeManagers/sideload/games'
import * as GOGGameManager from 'backend/storeManagers/gog/games'
import * as LegendaryGameManager from 'backend/storeManagers/legendary/games'

import * as HyperPlayLibraryManager from 'backend/storeManagers/hyperplay/library'
import * as SideloadLibraryManager from 'backend/storeManagers/sideload/library'
import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import * as LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import { GameManager, LibraryManager } from 'common/types/game_manager'

import { logInfo, RunnerToLogPrefixMap } from 'backend/logger/logger'

import { addToQueue } from 'backend/downloadmanager/downloadqueue'
import { DMQueueElement, GameInfo } from 'common/types'
interface GameManagerMap {
  [key: string]: GameManager
}

export const gameManagerMap: GameManagerMap = {
  hyperplay: HyperPlayGameManager,
  sideload: SideloadGameManager,
  gog: GOGGameManager,
  legendary: LegendaryGameManager
}

interface LibraryManagerMap {
  [key: string]: LibraryManager
}

export const libraryManagerMap: LibraryManagerMap = {
  hyperplay: HyperPlayLibraryManager,
  sideload: SideloadLibraryManager,
  gog: GOGLibraryManager,
  legendary: LegendaryLibraryManager
}

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

export function autoUpdate(runner: string, gamesToUpdate: string[]) {
  const logPrefix = RunnerToLogPrefixMap[runner]
  gamesToUpdate.forEach(async (appName) => {
    const { ignoreGameUpdates } = await gameManagerMap[runner].getSettings(
      appName
    )
    const gameInfo = gameManagerMap[runner].getGameInfo(appName)
    if (!ignoreGameUpdates) {
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
  await LegendaryLibraryManager.initLegendaryLibraryManager()
  await GOGLibraryManager.refresh()
}
