import { RecentGame } from '../../../common/types'

let list: RecentGame[] = []

const addRecentGame = (game: RecentGame) => {
  list.unshift(game)
}

const removeRecentGame = (game: RecentGame) => {
  list = list.filter((g) => g.appName === game.appName)
}

const getRecentGames = () => {
  return list
}

const testingExportsRecentGames = {
  setRecentGames: (games: RecentGame[] = []) => {
    list = games
  }
}

export {
  getRecentGames,
  addRecentGame,
  removeRecentGame,
  testingExportsRecentGames
}
