import { existsSync } from 'graceful-fs'
import { ipcMain } from 'electron'
import i18next from 'i18next'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from './nonesteamgame/nonesteamgame'
import { getGame, getInfo, notify } from '../utils'
import { shortcutFiles } from './shortcuts/shortcuts'
import {
  addAppShortcuts,
  getAppInfo,
  removeAppShortcuts
} from '../sideload/games'
import { isMac } from 'backend/constants'

ipcMain.on('addShortcut', async (event, appName, runner, fromMenu) => {
  const isSideload = runner === 'sideload'

  if (isSideload) {
    addAppShortcuts(appName, fromMenu)
  } else {
    const game = getGame(appName, runner)
    await game.addShortcuts(fromMenu)
  }

  const body = i18next.t(
    'box.shortcuts.message',
    'Shortcuts were created on Desktop and Start Menu'
  )

  const bodyMac = i18next.t(
    'box.shortcuts.message-mac',
    'Shortcuts were created on the Applications folder'
  )

  notify({
    body: isMac ? bodyMac : body,
    title: i18next.t('box.shortcuts.title', 'Shortcuts')
  })
})

ipcMain.handle('shortcutsExists', (event, appName, runner) => {
  const isSideload = runner === 'sideload'
  let title = ''

  if (isSideload) {
    title = getAppInfo(appName).title
  } else {
    title = getGame(appName, runner).getGameInfo().title
  }
  const [desktopFile, menuFile] = shortcutFiles(title)

  return existsSync(desktopFile ?? '') || existsSync(menuFile ?? '')
})

ipcMain.on('removeShortcut', async (event, appName, runner) => {
  const isSideload = runner === 'sideload'

  if (isSideload) {
    removeAppShortcuts(appName)
  } else {
    const game = getGame(appName, runner)
    await game.removeShortcuts()
  }
  const body = i18next.t(
    'box.shortcuts.message-remove',
    'Shortcuts were removed from Desktop and Start Menu'
  )

  const bodyMac = i18next.t(
    'box.shortcuts.message-remove-mac',
    'Shortcuts were removed from the Applications folder'
  )

  notify({
    body: isMac ? bodyMac : body,
    title: i18next.t('box.shortcuts.title', 'Shortcuts Removed')
  })
})

ipcMain.handle('addToSteam', async (event, appName, runner) => {
  const gameInfo = getInfo(appName, runner)
  return addNonSteamGame({ gameInfo })
})

ipcMain.handle('removeFromSteam', async (event, appName, runner) => {
  const gameInfo = getInfo(appName, runner)
  await removeNonSteamGame({ gameInfo })
})

ipcMain.handle('isAddedToSteam', async (event, appName, runner) => {
  const gameInfo = getInfo(appName, runner)
  return isAddedToSteam({ gameInfo })
})
