import { ipcMain, ipcRenderer } from 'electron'
import i18next from 'i18next'
//import { logError, logInfo } from '../logger/logger'
import { Game } from '../games'
import { Runner } from '../types'
//import { addNoneSteamGame } from './nonesteamgame'

ipcMain.on(
  'addShortcut',
  async (event, appName: string, runner: Runner, fromMenu: boolean) => {
    console.log(fromMenu)
    const game = Game.get(appName, runner)
    game.addShortcuts(fromMenu)

    // await addNoneSteamGame(await game.getGameInfo())
    //   .then((message) => logInfo(message))
    //   .catch((error) => logError(`${error}`))

    ipcRenderer.invoke('openMessageBox', {
      buttons: [i18next.t('box.ok', 'Ok')],
      message: i18next.t(
        'box.shortcuts.message',
        'Shortcuts were created on Desktop and Start Menu'
      ),
      title: i18next.t('box.shortcuts.title', 'Shortcuts')
    })
  }
)

ipcMain.on('removeShortcut', async (event, appName: string, runner: Runner) => {
  const game = Game.get(appName, runner)
  game.removeShortcuts()
})
