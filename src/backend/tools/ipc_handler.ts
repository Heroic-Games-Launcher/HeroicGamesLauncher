import { ipcMain } from 'electron'
import { Winetricks, runWineCommandOnGame } from '.'
import path from 'path'
import { isWindows } from 'backend/constants'
import { execAsync, sendGameStatusUpdate } from 'backend/utils'
import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import { sendFrontendMessage } from 'backend/main_window'
import { getGameConfig } from '../config/game'

ipcMain.handle(
  'runWineCommandForGame',
  async (event, { appName, commandParts, runner }) => {
    if (isWindows) {
      return execAsync(commandParts.join(' '))
    }

    // FIXME: Why are we using `runinprefix` here?
    return runWineCommandOnGame(runner, appName, {
      commandParts,
      wait: false,
      protonVerb: 'runinprefix',
      gameConfig: getGameConfig(appName, runner)
    })
  }
)

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
ipcMain.handle('callTool', async (event, { tool, exe, appName, runner }) => {
  const gameConfig = getGameConfig(appName, runner)

  switch (tool) {
    case 'winetricks':
      await Winetricks.run(runner, appName)
      break
    case 'winecfg':
      await runWineCommandOnGame(runner, appName, {
        gameConfig,
        commandParts: ['winecfg'],
        wait: false
      })
      break
    case 'runExe':
      if (exe) {
        const workingDir = path.parse(exe).dir
        await runWineCommandOnGame(runner, appName, {
          gameConfig,
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
    sendFrontendMessage(
      'pushGameToLibrary',
      GOGLibraryManager.getGameInfo(appName)
    )
  }

  sendGameStatusUpdate({ appName, runner, status: 'done' })
})

ipcMain.on('winetricksInstall', async (event, { runner, appName, component }) =>
  Winetricks.install(runner, appName, component)
)

ipcMain.handle('winetricksAvailable', async (event, { runner, appName }) => {
  try {
    return await Winetricks.listAvailable(runner, appName)
  } catch {
    return []
  }
})

ipcMain.handle('winetricksInstalled', async (event, { runner, appName }) => {
  try {
    return await Winetricks.listInstalled(runner, appName)
  } catch {
    return []
  }
})
