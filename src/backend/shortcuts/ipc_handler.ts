import { existsSync } from 'graceful-fs'
import { ipcMain, dialog } from 'electron'
import i18next from 'i18next'
import { Runner } from 'common/types'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from './nonesteamgame/nonesteamgame'
import { getGame } from '../utils'
import { shortcutFiles } from './shortcuts/shortcuts'

ipcMain.on(
  'addShortcut',
  async (event, appName: string, runner: Runner, fromMenu: boolean) => {
    const game = getGame(appName, runner)
    await game.addShortcuts(fromMenu)

    dialog.showMessageBox({
      buttons: [i18next.t('box.ok', 'Ok')],
      message: i18next.t(
        'box.shortcuts.message',
        'Shortcuts were created on Desktop and Start Menu'
      ),
      title: i18next.t('box.shortcuts.title', 'Shortcuts')
    })
  }
)

ipcMain.handle('shortcutsExists', (event, appName: string, runner: Runner) => {
  const title = getGame(appName, runner).getGameInfo().title
  const [desktopFile, menuFile] = shortcutFiles(title)

  return existsSync(desktopFile ?? '') || existsSync(menuFile ?? '')
})

ipcMain.on('removeShortcut', async (event, appName: string, runner: Runner) => {
  const game = getGame(appName, runner)
  await game.removeShortcuts()
  dialog.showMessageBox({
    buttons: [i18next.t('box.ok', 'Ok')],
    message: i18next.t(
      'box.shortcuts.message-remove',
      'Shortcuts were removed from Desktop and Start Menu'
    ),
    title: i18next.t('box.shortcuts.title', 'Shortcuts Removed')
  })
})

ipcMain.handle('addToSteam', async (event, appName: string, runner: Runner) => {
  const game = getGame(appName, runner)
  const gameInfo = await game.getGameInfo()

  return addNonSteamGame({ gameInfo })
})

ipcMain.handle(
  'removeFromSteam',
  async (event, appName: string, runner: Runner) => {
    const game = getGame(appName, runner)
    const gameInfo = await game.getGameInfo()

    await removeNonSteamGame({ gameInfo })
  }
)

ipcMain.handle(
  'isAddedToSteam',
  async (event, appName: string, runner: Runner) => {
    const game = getGame(appName, runner)
    const gameInfo = await game.getGameInfo()

    return isAddedToSteam({ gameInfo })
  }
)
