import { gameManagerMap } from 'backend/storeManagers'
import { addListener, addHandler, sendFrontendMessage } from '../ipc'
import { Winetricks, runWineCommandOnGame } from '.'
import path from 'path'
import { execAsync, sendGameStatusUpdate } from 'backend/utils'
import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import { isWindows } from 'backend/constants/environment'

addHandler(
  'runWineCommandForGame',
  async (event, { appName, commandParts, runner }) => {
    if (isWindows) {
      return execAsync(commandParts.join(' '))
    }

    // FIXME: Why are we using `runinprefix` here?
    return runWineCommandOnGame(runner, appName, {
      commandParts,
      wait: false,
      protonVerb: 'runinprefix'
    })
  }
)

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
addHandler('callTool', async (event, { tool, exe, appName, runner }) => {
  const gameSettings = await gameManagerMap[runner].getSettings(appName)

  switch (tool) {
    case 'winetricks':
      await Winetricks.run(runner, appName)
      break
    case 'winecfg':
      await runWineCommandOnGame(runner, appName, {
        gameSettings,
        commandParts: ['winecfg'],
        wait: false
      })
      break
    case 'runExe':
      if (exe) {
        const workingDir = path.parse(exe).dir
        await runWineCommandOnGame(runner, appName, {
          gameSettings,
          commandParts: [exe],
          wait: false,
          startFolder: workingDir
        })
      }
      break
  }
  if (runner === 'gog') {
    // Check if game was modified by offline installer / wine uninstaller
    await GOGLibraryManager.checkForOfflineInstallerChanges(appName)
    const maybeNewGameInfo = GOGLibraryManager.getGameInfo(appName)
    if (maybeNewGameInfo)
      sendFrontendMessage('pushGameToLibrary', maybeNewGameInfo)
  }

  sendGameStatusUpdate({ appName, runner, status: 'done' })
})

addListener('winetricksInstall', async (event, runner, appName, component) =>
  Winetricks.install(runner, appName, component)
)

addHandler('winetricksAvailable', async (event, runner, appName) => {
  try {
    return await Winetricks.listAvailable(runner, appName)
  } catch {
    return []
  }
})

addHandler('winetricksInstalled', async (event, runner, appName) => {
  try {
    return await Winetricks.listInstalled(runner, appName)
  } catch {
    return []
  }
})
