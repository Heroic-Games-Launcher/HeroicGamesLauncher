import { addHandler } from 'backend/ipc'
import { getWikiGameInfo } from './wiki_game_info'

addHandler('getWikiGameInfo', async (e, title, appName, runner) =>
  getWikiGameInfo(title, appName, runner)
)
