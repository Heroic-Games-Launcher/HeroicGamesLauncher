import { RecentGame } from 'common/types'
import { backendEvents } from '../backend_events'
import { sendFrontendMessage } from '../ipc'
import { GlobalConfig } from '../config'
import { configStore } from 'backend/constants/key_value_stores'
import type { Game } from 'common/types/game_manager'

const maxRecentGames = async () => {
  const { maxRecentGames } = GlobalConfig.get().getSettings()
  return maxRecentGames || 5
}

const getRecentGames = async (options?: { limited: boolean }) => {
  const games = configStore.get('games.recent', [])
  if (options?.limited) {
    return games.slice(0, await maxRecentGames())
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

const addRecentGame = async (game: Game) => {
  const games = await getRecentGames()

  // update list
  const updatedList = games.filter((a) => a.appName && a.appName !== game.id)
  updatedList.unshift({ appName: game.id, title: game.getGameInfo().title })
  setRecentGames(updatedList)
}

const removeRecentGame = async (game: Game) => {
  const games = await getRecentGames()

  if (games.length) {
    const updatedList = games.filter((a) => a.appName && a.appName !== game.id)
    setRecentGames(updatedList)
  }
}

export { getRecentGames, addRecentGame, removeRecentGame, maxRecentGames }

// Exported only for testing purpose
// ts-prune-ignore-next
export const testingExportsRecentGames = {
  setRecentGames
}
