import { ipcMain, ipcRenderer } from 'electron'
import i18next from 'i18next'
import { Game } from '../games'
import { Runner } from '../types'
import { addNonSteamGame, removeNonSteamGame } from './nonsteamgame'
import { steamUserdataDir } from '../constants'

ipcMain.on(
  'addShortcut',
  async (event, appName: string, runner: Runner, fromMenu: boolean) => {
    const game = Game.get(appName, runner)
    game.addShortcuts(fromMenu)

    await ipcRenderer.invoke('openMessageBox', {
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

ipcMain.handle('addToSteam', async (event, appName: string, runner: Runner) => {
  const game = Game.get(appName, runner)
  const gameInfo = await game.getGameInfo()

  await addNonSteamGame({ steamUserdataDir, gameInfo })
})

ipcMain.handle(
  'removeFromSteam',
  async (event, appName: string, runner: Runner) => {
    const game = Game.get(appName, runner)
    const gameInfo = await game.getGameInfo()

    await removeNonSteamGame({ steamUserdataDir, gameInfo })
  }
)
