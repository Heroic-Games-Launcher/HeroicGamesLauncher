import { addHandler } from 'common/ipc/backend'
import { getWikiGameInfo } from './wiki_game_info'

addHandler('getWikiGameInfo', async (e, title, appName, runner) =>
  getWikiGameInfo(title, appName, runner)
)
