import { RecentGame } from 'common/types'
import { BrowserWindow, ipcMain } from 'electron'
import { GlobalConfig } from './config'
import { configStore } from './constants'
import { GOGGame } from './gog/games'
import { LegendaryGame } from './legendary/games'

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

const addRecentGame = async (game: LegendaryGame | GOGGame) => {
  const games = await getRecentGames()
  const { title } = game.getGameInfo()

  // update list
  const updatedList = games.filter(
    (a) => a.appName && a.appName !== game.appName
  )
  updatedList.unshift({ appName: game.appName, title })

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

ipcMain.handle('removeRecent', async (_event, appName: string) => {
  removeRecentGame(appName)
})

export { getRecentGames, addRecentGame, removeRecentGame }
