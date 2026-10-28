import { libraryManagerMap } from 'backend/storeManagers'
import { addListener, addHandler, sendFrontendMessage } from '../ipc'
import { Winetricks } from '.'
import path from 'path'
import { execAsync, sendGameStatusUpdate } from 'backend/utils'
import { isWindows } from 'backend/constants/environment'
import { runWineCommand } from '../launcher'

addHandler('runWineCommandForGame', async (event, game, commandParts) => {
  if (isWindows) {
    return execAsync(commandParts.join(' '))
  }

  return runWineCommand(game, {
    commandParts,
    wait: false,
    protonVerb: 'runinprefix'
  })
})

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
addHandler('callTool', async (event, game, tool, exe) => {
  switch (tool) {
    case 'winetricks':
      await Winetricks.run(game)
      break
    case 'winecfg':
      await runWineCommand(game, {
        commandParts: ['winecfg'],
        wait: false
      })
      break
    case 'runExe':
      if (exe) {
        const workingDir = path.parse(exe).dir
        await runWineCommand(game, {
          commandParts: [exe],
          wait: false,
          startFolder: workingDir
        })
      }
      break
  }
  if (game.runner === 'gog') {
    // Check if game was modified by offline installer / wine uninstaller
    await libraryManagerMap['gog'].checkForOfflineInstallerChanges(game.id)
    const maybeNewGameInfo = libraryManagerMap['gog'].getGameInfo(game.id)
    if (maybeNewGameInfo)
      sendFrontendMessage('pushGameToLibrary', maybeNewGameInfo)
  }

  sendGameStatusUpdate(game, 'done')
})

addListener('winetricksInstall', async (event, game, component) =>
  Winetricks.install(game, component)
)

addHandler('winetricksAvailable', async (event, game) => {
  return Winetricks.listAvailable(game)
})

addHandler('winetricksInstalled', async (event, game) => {
  return Winetricks.listInstalled(game)
})
