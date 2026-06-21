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

addHandler('game.getReleaseDate', async (_e, game) => {
  const candidates: Date[] = []
  const releaseDate = (await game.getReleaseDate?.()) ?? null
  if (releaseDate) candidates.push(releaseDate)

  const wikiGameInfo = await getWikiGameInfo(game)
  const pcgwReleaseDates = wikiGameInfo?.pcgamingwiki?.releaseDate ?? []
  for (const releaseDate of pcgwReleaseDates) {
    // "release dates" from PCGW are actually "<platform>: <date>" strings
    const [, dateStr] = releaseDate.split(':')
    const parsed = new Date(Date.parse(dateStr))
    candidates.push(parsed)
  }

  return candidates.find((d) => !isNaN(d.valueOf())) ?? null
})

addHandler(
  'game.getDescription',
  async (_e, game) => game.getDescription?.() ?? null
)
