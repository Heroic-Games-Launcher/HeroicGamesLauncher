import { getInfoFromGamesDB } from 'backend/wiki_game_info/gamesdb/utils'
import { getInfoFromProtonDB } from 'backend/wiki_game_info/protondb/utils'
import { getSteamDeckComp } from 'backend/wiki_game_info/steamdeck/utils'
import { wikiGameInfoStore } from './electronStore'
import { removeSpecialcharacters } from '../utils'
import { PCGamingWikiInfo, Runner, SteamInfo, WikiInfo } from 'common/types'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { getInfoFromAppleGamingWiki } from './applegamingwiki/utils'
import { getHowLongToBeat } from './howlongtobeat/utils'
import { getInfoFromPCGamingWiki } from './pcgamingwiki/utils'
import { getUmuId } from './umu/utils'
import { isLinux, isMac } from 'backend/constants/environment'
import { gameManagerMap } from 'backend/storeManagers'

/**
 * Builds the "wiki" info for a Steam game. PCGamingWiki (which works again after
 * the User-Agent fix) is the primary source - it provides a portrait cover, the
 * HowLongToBeat ID and review scores - and Steam's own store API fills in
 * anything missing (score, genres, release date and a fallback cover). Results
 * are mapped into the same shape the UI reads from PCGamingWiki, so no frontend
 * changes are needed.
 */
async function getSteamWikiInfo(
  title: string,
  appName: string
): Promise<WikiInfo> {
  const gameInfo = gameManagerMap['steam'].getGameInfo(appName)
  const extraInfo = await gameManagerMap['steam'].getExtraInfo(appName)

  const pcgw = await getInfoFromPCGamingWiki(title)

  const hasScore = (score: { score: string } | undefined) =>
    !!score && !!score.score
  const hasList = (list: string[] | undefined) =>
    !!list && list.some((entry) => entry !== '')

  const pcgamingwiki: PCGamingWikiInfo = {
    steamID: pcgw?.steamID || appName,
    howLongToBeatID: pcgw?.howLongToBeatID || '',
    // Prefer PCGamingWiki's Metacritic (it has a real slug to link to);
    // otherwise use Steam's score with an empty slug (UI then title-searches).
    metacritic: hasScore(pcgw?.metacritic)
      ? pcgw!.metacritic
      : { score: extraInfo.score ?? '', urlid: '' },
    opencritic: pcgw?.opencritic ?? { score: '', urlid: '' },
    igdb: pcgw?.igdb ?? { score: '', urlid: '' },
    direct3DVersions: pcgw?.direct3DVersions ?? [],
    genres: hasList(pcgw?.genres) ? pcgw!.genres : (extraInfo.genres ?? []),
    releaseDate: hasList(pcgw?.releaseDate)
      ? pcgw!.releaseDate
      : extraInfo.releaseDate
        ? [extraInfo.releaseDate]
        : [],
    // Prefer PCGamingWiki's portrait cover; fall back to Steam's (landscape)
    // store image when the game has no PCGamingWiki cover.
    cover: pcgw?.cover || extraInfo.cover || undefined
  }

  const howlongtobeat = await getHowLongToBeat(
    title,
    gameInfo,
    pcgamingwiki.howLongToBeatID || undefined
  )

  return {
    pcgamingwiki,
    applegamingwiki: null,
    howlongtobeat,
    gamesdb: null,
    steamInfo: null,
    umuId: null
  }
}

export async function getWikiGameInfo(
  title: string,
  appName: string,
  runner: Runner
): Promise<WikiInfo | null> {
  const gameInfo = gameManagerMap[runner].getGameInfo(appName)

  try {
    title = removeSpecialcharacters(title)

    // Steam games combine PCGamingWiki with Steam's own store API (see
    // getSteamWikiInfo). Cache under an appName-namespaced key: it's stable
    // (titles can collide/change) and avoids reusing the empty entries an older
    // build cached under the plain title.
    if (runner === 'steam') {
      const steamCacheKey = `steam:${appName}`
      const cached = wikiGameInfoStore.get(steamCacheKey)
      if (cached) {
        logInfo(
          [`Using cached ExtraGameInfo data for ${title}`],
          LogPrefix.ExtraGameInfo
        )
        return cached
      }
      logInfo(
        `Getting ExtraGameInfo data for ${title}`,
        LogPrefix.ExtraGameInfo
      )
      const steamWikiInfo = await getSteamWikiInfo(title, appName)
      wikiGameInfoStore.set(steamCacheKey, steamWikiInfo)
      return steamWikiInfo
    }

    // check if we have a cached response
    const cachedResponse = wikiGameInfoStore.get(title)
    if (cachedResponse) {
      logInfo(
        [`Using cached ExtraGameInfo data for ${title}`],
        LogPrefix.ExtraGameInfo
      )
      return cachedResponse
    }

    logInfo(`Getting ExtraGameInfo data for ${title}`, LogPrefix.ExtraGameInfo)

    const [pcgamingwiki, gamesdb, applegamingwiki, umuId] = await Promise.all([
      getInfoFromPCGamingWiki(title, runner === 'gog' ? appName : undefined),
      getInfoFromGamesDB(title, appName, runner),
      isMac ? getInfoFromAppleGamingWiki(title) : null,
      isLinux ? getUmuId(appName, runner) : null
    ])

    // Get HowLongToBeat data, using gog.com site for GOG games, and HLTB ID from PCGamingWiki if available
    const howlongtobeat = await getHowLongToBeat(
      title,
      gameInfo,
      pcgamingwiki?.howLongToBeatID
    )

    let steamInfo = null
    if (isLinux) {
      // gamesdb is more accurate since we always query by appName
      // pcgamingwiki is queried by title in most cases
      const steamID = gamesdb?.steamID || pcgamingwiki?.steamID
      const [protondb, steamdeck] = await Promise.all([
        getInfoFromProtonDB(steamID),
        getSteamDeckComp(steamID)
      ])

      if (protondb || steamdeck) {
        steamInfo = {
          compatibilityLevel: protondb?.level,
          steamDeckCatagory: steamdeck?.category
        } as SteamInfo
      }
    }

    const wikiGameInfo = {
      pcgamingwiki,
      applegamingwiki,
      howlongtobeat,
      gamesdb,
      steamInfo,
      umuId
    }

    wikiGameInfoStore.set(title, wikiGameInfo)

    return wikiGameInfo
  } catch (error) {
    logError(
      [`Was not able to get ExtraGameInfo data for ${title}`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}
