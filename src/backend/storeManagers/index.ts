import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import * as LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import * as NileLibraryManager from 'backend/storeManagers/nile/library'

import { GameManager, LibraryManager } from 'common/types/game_manager'
import { logInfo, RunnerToLogPrefixMap } from 'backend/logger'
import { addToQueue } from 'backend/downloadmanager/downloadqueue'
import { DMQueueElement, GameInfo, Runner } from 'common/types'
import { runnerMap } from 'backend/runners'

type GameManagerMap = {
  [key in Runner]: GameManager
}
type LibraryManagerMap = {
  [key in Runner]: LibraryManager
}

export const gameManagerMap: GameManagerMap = (() =>
  Object.fromEntries(
    Object.entries(runnerMap).map(([runner, config]) => [
      runner,
      config.gameManager
    ])
  ) as GameManagerMap)()

export const libraryManagerMap: LibraryManagerMap = (() =>
  Object.fromEntries(
    Object.entries(runnerMap).map(([runner, config]) => [
      runner,
      config.library
    ])
  ) as LibraryManagerMap)()

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
  await LegendaryLibraryManager.initLegendaryLibraryManager()
  await GOGLibraryManager.initGOGLibraryManager()
  await NileLibraryManager.initNileLibraryManager()
}
