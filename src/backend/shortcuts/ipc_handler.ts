import { libraryManagerMap } from 'backend/storeManagers'
import { existsSync } from 'graceful-fs'
import { addListener, addHandler } from 'backend/ipc'
import i18next from 'i18next'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from './nonesteamgame/nonesteamgame'
import { shortcutFiles } from './shortcuts/shortcuts'
import { notify } from 'backend/dialog/dialog'
import { isMac } from 'backend/constants/environment'

addListener('addShortcut', async (event, appName, runner, fromMenu) => {
  libraryManagerMap[runner].getGame(appName).addShortcuts(fromMenu)

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

addHandler('shortcutsExists', (event, appName, runner) => {
  const { title } = libraryManagerMap[runner].getGame(appName).getGameInfo()

  const [desktopFile, menuFile] = shortcutFiles(title)

  return existsSync(desktopFile ?? '') || existsSync(menuFile ?? '')
})

addListener('removeShortcut', async (event, appName, runner) => {
  libraryManagerMap[runner].getGame(appName).removeShortcuts()

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

addHandler('addToSteam', async (event, appName, runner) => {
  const game = libraryManagerMap[runner].getGame(appName)
  const gameInfo = game.getGameInfo()

  return addNonSteamGame({
    gameInfo
  })
})

addHandler('removeFromSteam', async (event, appName, runner) => {
  const game = libraryManagerMap[runner].getGame(appName)
  const gameInfo = game.getGameInfo()
  await removeNonSteamGame({ gameInfo })
})

addHandler('isAddedToSteam', async (event, appName, runner) => {
  const game = libraryManagerMap[runner].getGame(appName)
  const gameInfo = game.getGameInfo()
  return isAddedToSteam({ gameInfo })
})
