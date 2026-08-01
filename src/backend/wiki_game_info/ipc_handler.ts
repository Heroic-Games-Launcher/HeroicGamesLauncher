import { addHandler } from 'backend/ipc'
import { getWikiGameInfo } from './wiki_game_info'
import { getGame } from 'backend/utils'

addHandler('getWikiGameInfo', async (e, title, appName, runner) =>
  getWikiGameInfo(getGame(appName, runner))
)
