import { existsSync } from 'graceful-fs'
import { GlobalConfig } from '../config'
import { ipcMain, dialog } from 'electron'
import i18next from 'i18next'
import { join } from 'path'
import { Game } from '../games'
import { Runner } from '../types'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from './nonesteamgame/nonesteamgame'
import { shortcutFiles } from './shortcuts/shortcuts'

const getSteamUserdataDir = async () => {
  const { defaultSteamPath } = await GlobalConfig.get().getSettings()
  return join(defaultSteamPath.replaceAll("'", ''), 'userdata')
}

ipcMain.on(
  'addShortcut',
  async (event, appName: string, runner: Runner, fromMenu: boolean) => {
    const game = Game.get(appName, runner)
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
  const title = Game.get(appName, runner).getGameInfo().title
  const [desktopFile, menuFile] = shortcutFiles(title)

  return existsSync(desktopFile) || existsSync(menuFile)
})

ipcMain.on('removeShortcut', async (event, appName: string, runner: Runner) => {
  const game = Game.get(appName, runner)
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

ipcMain.handle(
  'addToSteam',
  async (
    event,
    appName: string,
    runner: Runner,
    bkgDataUrl: string,
    bigPicDataUrl: string
  ) => {
    const game = Game.get(appName, runner)
    const gameInfo = await game.getGameInfo()
    const steamUserdataDir = await getSteamUserdataDir()

    return addNonSteamGame({
      steamUserdataDir,
      gameInfo,
      bkgDataUrl,
      bigPicDataUrl
    })
  }
)

ipcMain.handle(
  'removeFromSteam',
  async (event, appName: string, runner: Runner) => {
    const game = Game.get(appName, runner)
    const gameInfo = await game.getGameInfo()
    const steamUserdataDir = await getSteamUserdataDir()

    await removeNonSteamGame({ steamUserdataDir, gameInfo })
  }
)

ipcMain.handle(
  'isAddedToSteam',
  async (event, appName: string, runner: Runner) => {
    const game = Game.get(appName, runner)
    const gameInfo = await game.getGameInfo()
    const steamUserdataDir = await getSteamUserdataDir()

    return isAddedToSteam({ steamUserdataDir, gameInfo })
  }
)
