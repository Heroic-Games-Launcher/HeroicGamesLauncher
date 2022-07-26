import { GlobalConfig } from '../config'
import { ipcMain, ipcRenderer } from 'electron'
import i18next from 'i18next'
import { join } from 'path'
import { Runner } from 'common/types'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from './nonesteamgame/nonesteamgame'
import { getGame } from '../utils'

const getSteamUserdataDir = async () => {
  const { defaultSteamPath } = await GlobalConfig.get().getSettings()
  return join(defaultSteamPath.replaceAll("'", ''), 'userdata')
}

ipcMain.on(
  'addShortcut',
  async (event, appName: string, runner: Runner, fromMenu: boolean) => {
    const game = getGame(appName, runner)
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
  const game = getGame(appName, runner)
  game.removeShortcuts()
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
    const game = getGame(appName, runner)
    const gameInfo = await game.getGameInfo()
    const steamUserdataDir = await getSteamUserdataDir()

    await addNonSteamGame({
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
    const game = getGame(appName, runner)
    const gameInfo = await game.getGameInfo()
    const steamUserdataDir = await getSteamUserdataDir()

    await removeNonSteamGame({ steamUserdataDir, gameInfo })
  }
)

ipcMain.handle(
  'isAddedToSteam',
  async (event, appName: string, runner: Runner) => {
    const game = getGame(appName, runner)
    const gameInfo = await game.getGameInfo()
    const steamUserdataDir = await getSteamUserdataDir()

    return isAddedToSteam({ steamUserdataDir, gameInfo })
  }
)
