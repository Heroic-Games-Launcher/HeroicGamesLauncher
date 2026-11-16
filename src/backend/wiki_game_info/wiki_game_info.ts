import { getInfoFromGamesDB } from 'backend/wiki_game_info/gamesdb/utils'
import { getInfoFromProtonDB } from 'backend/wiki_game_info/protondb/utils'
import { getSteamDeckComp } from 'backend/wiki_game_info/steamdeck/utils'
import { wikiGameInfoStore } from './electronStore'
import { removeSpecialcharacters } from '../utils'
import { PCGamingWikiInfo, SteamInfo, WikiInfo } from 'common/types'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { getInfoFromAppleGamingWiki } from './applegamingwiki/utils'
import { getHowLongToBeat } from './howlongtobeat/utils'
import { getInfoFromPCGamingWiki } from './pcgamingwiki/utils'
import { getUmuId } from './umu/utils'
import { isLinux, isMac } from 'backend/constants/environment'
import type { Game } from 'common/types/game_manager'

async function getSteamWikiInfo(
  title: string,
  appName: string,
  game: Game
): Promise<WikiInfo> {
  const pcgw = await getInfoFromPCGamingWiki(title)

  const pcgamingwiki: PCGamingWikiInfo = {
    steamID: pcgw?.steamID || appName,
    howLongToBeatID: pcgw?.howLongToBeatID || '',
    metacritic: pcgw?.metacritic ?? { score: '', urlid: '' },
    opencritic: pcgw?.opencritic ?? { score: '', urlid: '' },
    igdb: pcgw?.igdb ?? { score: '', urlid: '' },
    direct3DVersions: pcgw?.direct3DVersions ?? [],
    genres: pcgw?.genres ?? [],
    releaseDate: pcgw?.releaseDate ?? [],
    cover: pcgw?.cover || undefined
  }

  const howlongtobeat = await getHowLongToBeat(
    game,
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

export async function getWikiGameInfo(game: Game): Promise<WikiInfo | null> {
  const gameInfo = game.getGameInfo()
  const appName = gameInfo.app_name
  const runner = gameInfo.runner

  try {
    const title = removeSpecialcharacters(gameInfo.title)

    // Steam titles can collide across apps
    const cacheKey = runner === 'steam' ? `steam:${appName}` : title

    // check if we have a cached response
    const cachedResponse = wikiGameInfoStore.get(cacheKey)
    if (cachedResponse) {
      logInfo(
        [`Using cached ExtraGameInfo data for ${title}`],
        LogPrefix.ExtraGameInfo
      )
      return cachedResponse
    }

    logInfo(`Getting ExtraGameInfo data for ${title}`, LogPrefix.ExtraGameInfo)

    if (runner === 'steam') {
      const steamWikiInfo = await getSteamWikiInfo(title, appName, game)
      wikiGameInfoStore.set(cacheKey, steamWikiInfo)
      return steamWikiInfo
    }

    const [pcgamingwiki, gamesdb, applegamingwiki, umuId] = await Promise.all([
      getInfoFromPCGamingWiki(title, runner === 'gog' ? appName : undefined),
      getInfoFromGamesDB(title, appName, runner),
      isMac ? getInfoFromAppleGamingWiki(title) : null,
      isLinux ? getUmuId(appName, runner) : null
    ])

    // Get HowLongToBeat data, using gog.com site for GOG games, and HLTB ID from PCGamingWiki if available
    const howlongtobeat = await getHowLongToBeat(
      game,
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

    wikiGameInfoStore.set(cacheKey, wikiGameInfo)

    return wikiGameInfo
  } catch (error) {
    logError(
      [`Was not able to get ExtraGameInfo data for ${gameInfo.title}`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}
