import { GOGGame } from '../../gog/games'
import { LegendaryGame } from '../../legendary/games'
import { getAppInfo } from '../../sideload/games'
import { GameInfo, Runner, SideloadGame } from 'common/types'

function getGame(appName: string, runner: Runner) {
  switch (runner) {
    case 'legendary':
      return LegendaryGame.get(appName)
    default:
      return GOGGame.get(appName)
  }
}

function getInfo(appName: string, runner: Runner): GameInfo | SideloadGame {
  if (runner === 'sideload') {
    return getAppInfo(appName)
  }
  const game = getGame(appName, runner)
  return game.getGameInfo()
}

export { getGame, getInfo }
