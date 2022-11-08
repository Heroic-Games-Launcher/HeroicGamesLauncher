import { GameInfo, RecentGame } from 'common/types'
import { BrowserWindow, ipcMain } from 'electron'
import { GlobalConfig } from './config'
import { configStore } from './constants'

const getRecentGames = async (options?: { limited: boolean }) => {
  const games = configStore.get('games.recent', []) as Array<RecentGame>
  if (options?.limited) {
    const { maxRecentGames: MAX_RECENT_GAMES = 5 } =
      await GlobalConfig.get().getSettings()
    return games.slice(0, MAX_RECENT_GAMES)
  } else {
    return games
  }
}

const addRecentGame = async (game: GameInfo) => {
  const games = await getRecentGames()

  // update list
  const updatedList = games.filter(
    (a) => a.appName && a.appName !== game.app_name
  )
  updatedList.unshift({ appName: game.app_name, title: game.title })

  // store
  configStore.set('games.recent', updatedList)

  // emit
  const window = BrowserWindow.getAllWindows()[0]
  window.webContents.send('recentGamesChanged', updatedList)
}

const removeRecentGame = async (appName: string) => {
  const games = await getRecentGames()

  if (games.length) {
    const updatedList = games.filter((a) => a.appName && a.appName !== appName)
    configStore.set('games.recent', updatedList)

    const window = BrowserWindow.getAllWindows()[0]
    window.webContents.send('recentGamesChanged', updatedList)
  }
}

ipcMain.handle('removeRecent', async (_event, appName) =>
  removeRecentGame(appName)
)

export { getRecentGames, addRecentGame, removeRecentGame }
