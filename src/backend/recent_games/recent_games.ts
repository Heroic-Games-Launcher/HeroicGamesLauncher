import { GameInfo, RecentGame, Runner } from 'common/types'
import { backendEvents } from '../backend_events'
import { sendFrontendMessage } from '../ipc'
import { GlobalConfig } from '../config'
import { configStore } from 'backend/constants/key_value_stores'
import { configStore as steamConfigStore } from 'backend/storeManagers/steam/electronStores'

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

const addRecentGame = async (game: GameInfo) => {
  const games = await getRecentGames()

  // update list
  const updatedList = games.filter(
    (a) => a.appName && a.appName !== game.app_name
  )
  updatedList.unshift({
    appName: game.app_name,
    title: game.title,
    runner: game.runner
  })
  setRecentGames(updatedList)
}

const removeRecentGame = async (appName: string) => {
  const games = await getRecentGames()

  if (games.length) {
    const updatedList = games.filter((a) => a.appName && a.appName !== appName)
    setRecentGames(updatedList)
  }
}

/** Hide Steam games while logged out. */
const visibleRecentGames = (games: RecentGame[]) => {
  const steamLoggedIn = steamConfigStore.get('isLoggedIn', false)
  return games.filter((game) => steamLoggedIn || game.runner !== 'steam')
}

/** Tag older untagged entries with a runner. */
const tagRecentGames = async (runner: Runner, appNames: Set<string>) => {
  const games = await getRecentGames()
  let tagged = false
  const updatedList = games.map((game) => {
    if (game.runner || !appNames.has(game.appName)) return game
    tagged = true
    return { ...game, runner }
  })
  if (tagged) setRecentGames(updatedList)
}

/** Re-send the list after a login change. */
const notifyRecentGamesChanged = async () => {
  setRecentGames(await getRecentGames())
}

export {
  getRecentGames,
  addRecentGame,
  removeRecentGame,
  maxRecentGames,
  visibleRecentGames,
  tagRecentGames,
  notifyRecentGamesChanged
}

// Exported only for testing purpose
// ts-prune-ignore-next
export const testingExportsRecentGames = {
  setRecentGames
}
