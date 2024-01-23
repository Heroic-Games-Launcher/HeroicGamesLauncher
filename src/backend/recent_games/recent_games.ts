import { GameInfo, RecentGame } from 'common/types'
import { backendEvents } from '../backend_events'
import { sendFrontendMessage } from '../main_window'
import { configStore } from '../constants'
import { getGlobalConfig } from '../config/global'

const getRecentGames = async (options?: { limited: boolean }) => {
  const games = configStore.get('games.recent', [])
  const { maxRecentGames } = getGlobalConfig()
  if (options?.limited) {
    return games.slice(0, maxRecentGames)
  } else {
    return games
  }
}

const setRecentGames = (recentGames: RecentGame[]) => {
  // store
  configStore.set('games.recent', recentGames)

  // emit
  sendFrontendMessage('recentGamesChanged', recentGames)
  backendEvents.emit('recentGamesChanged', recentGames)
}

const addRecentGame = async (game: GameInfo) => {
  const games = await getRecentGames()

  // update list
  const updatedList = games.filter(
    (a) => a.appName && a.appName !== game.app_name
  )
  updatedList.unshift({ appName: game.app_name, title: game.title })
  setRecentGames(updatedList)
}

const removeRecentGame = async (appName: string) => {
  const games = await getRecentGames()

  if (games.length) {
    const updatedList = games.filter((a) => a.appName && a.appName !== appName)
    setRecentGames(updatedList)
  }
}

export { getRecentGames, addRecentGame, removeRecentGame }

// Exported only for testing purpose
// ts-prune-ignore-next
export const testingExportsRecentGames = {
  setRecentGames
}
