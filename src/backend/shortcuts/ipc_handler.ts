import { gameManagerMap } from 'backend/storeManagers'
import { existsSync } from 'graceful-fs'
import { ipcMain } from 'electron'
import i18next from 'i18next'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from './nonesteamgame/nonesteamgame'
import { getInfo } from '../utils'
import { shortcutFiles } from './shortcuts/shortcuts'
import { isMac } from 'backend/constants'
import { notify } from 'backend/dialog/dialog'

ipcMain.on('addShortcut', async (event, appName, runner, fromMenu) => {
  gameManagerMap[runner].addShortcuts(appName, fromMenu)

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
  const title = gameManagerMap[runner].getGameInfo(appName).title

  const [desktopFile, menuFile] = shortcutFiles(title)

  return existsSync(desktopFile ?? '') || existsSync(menuFile ?? '')
})

ipcMain.on('removeShortcut', async (event, appName, runner) => {
  gameManagerMap[runner].removeShortcuts(appName)

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

  return addNonSteamGame({
    gameInfo
  })
})

ipcMain.handle('removeFromSteam', async (event, appName, runner) => {
  const gameInfo = getInfo(appName, runner)
  await removeNonSteamGame({ gameInfo })
})

ipcMain.handle('isAddedToSteam', async (event, appName, runner) => {
  const gameInfo = getInfo(appName, runner)
  return isAddedToSteam({ gameInfo })
})
