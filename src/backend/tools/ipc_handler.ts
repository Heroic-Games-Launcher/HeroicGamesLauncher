import { gameManagerMap } from 'backend/storeManagers'
import { ipcMain } from 'electron'
import { Winetricks, runWineCommandOnGame } from '.'
import path from 'path'
import { isWindows } from 'backend/constants'
import { execAsync } from 'backend/utils'

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
      protonVerb: 'runinprefix'
    })
  }
)

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
ipcMain.handle('callTool', async (event, { tool, exe, appName, runner }) => {
  const gameSettings = await gameManagerMap[runner].getSettings(appName)

  switch (tool) {
    case 'winetricks':
      await Winetricks.run(runner, appName)
      break
    case 'winecfg':
      runWineCommandOnGame(runner, appName, {
        gameSettings,
        commandParts: ['winecfg'],
        wait: false
      })
      break
    case 'runExe':
      if (exe) {
        const workingDir = path.parse(exe).dir
        runWineCommandOnGame(runner, appName, {
          gameSettings,
          commandParts: [exe],
          wait: false,
          startFolder: workingDir
        })
      }
      break
  }
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
