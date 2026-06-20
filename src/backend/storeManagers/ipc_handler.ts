import { addHandler } from '../ipc'
import { getWikiGameInfo } from '../wiki_game_info/wiki_game_info'

addHandler('game.supportsChangelogs', (_e, game) => !!game.getChangelog)

addHandler(
  'game.getChangelog',
  async (_e, game) => game.getChangelog?.() ?? null
)

addHandler('game.getGenres', async (_e, game) => {
  const genres = (await game.getGenres?.()) ?? null
  if (genres) return genres

  const wikiGameInfo = await getWikiGameInfo(game)
  return wikiGameInfo?.pcgamingwiki?.genres ?? null
})
