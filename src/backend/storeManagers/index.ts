import * as SideloadGameManager from 'backend/storeManagers/sideload/games'
import * as GOGGameManager from 'backend/storeManagers/gog/games'
import * as LegendaryGameManager from 'backend/storeManagers/legendary/games'
import * as NileGameManager from 'backend/storeManagers/nile/games'
import * as ZoomGameManager from 'backend/storeManagers/zoom/games'

import * as SideloadLibraryManager from 'backend/storeManagers/sideload/library'
import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import * as LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import * as NileLibraryManager from 'backend/storeManagers/nile/library'
import * as ZoomLibraryManager from 'backend/storeManagers/zoom/library'
import { GameManager, LibraryManager } from 'common/types/game_manager'

import { logInfo, RunnerToLogPrefixMap } from 'backend/logger'

import { addToQueue } from 'backend/downloadmanager/downloadqueue'
import { DMQueueElement, GameInfo, GameSettings, Runner } from 'common/types'
import { GlobalConfig } from 'backend/config'
import LogWriter from 'backend/logger/log_writer'
import { isMac } from 'backend/constants/environment'
import { readFileSync } from 'fs'
import { join } from 'path'
type GameManagerMap = {
  [key in Runner]: GameManager
}

export const gameManagerMap: GameManagerMap = {
  sideload: SideloadGameManager,
  gog: GOGGameManager,
  legendary: LegendaryGameManager,
  nile: NileGameManager,
  zoom: ZoomGameManager
}

type LibraryManagerMap = {
  [key in Runner]: LibraryManager
}

export const libraryManagerMap: LibraryManagerMap = {
  sideload: SideloadLibraryManager,
  gog: GOGLibraryManager,
  legendary: LegendaryLibraryManager,
  nile: NileLibraryManager,
  zoom: ZoomLibraryManager
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
  if (GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    await ZoomLibraryManager.initZoomLibraryManager()
}

export function getTargetExePath(
  gameInfo: GameInfo,
  gameSettings: GameSettings,
  logWriter: LogWriter
) {
  const executable = gameSettings.targetExe || gameInfo.install.executable

  if (!executable) return executable
  if (!executable.endsWith('.app')) return executable

  // we can't execute a `.app` file directly
  // we have to use the path of the script inside the .app directory
  if (executable && isMac && executable.endsWith('.app')) {
    try {
      // look for the `CFBundleExecutable` key and the next value
      const plistContent = readFileSync(
        join(executable, 'Contents', 'Info.plist')
      ).toString()
      const matchResult = plistContent.match(
        /<key>CFBundleExecutable<\/key>\n\s+<string>(.*)<\/string>/m
      )
      if (matchResult) {
        // this is standarized inside .app bundles
        const newPath = join(executable, 'Contents', 'MacOS', matchResult[1])
        logWriter.logInfo(
          `Replaced ${executable} alternative executable with ${newPath}`
        )
        return newPath
      }
    } catch (error) {
      logWriter.logError('Error finding executable inside .app')
      logWriter.logError(error)
    }
  }

  return executable
}
