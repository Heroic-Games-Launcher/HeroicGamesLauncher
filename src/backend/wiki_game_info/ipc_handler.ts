import { addHandler } from 'backend/ipc'
import { getWikiGameInfo } from './wiki_game_info'

addHandler('getWikiGameInfo', async (e, game) => getWikiGameInfo(game))
