import { getInfoFromGamesDB } from 'backend/wiki_game_info/gamesdb/utils'
import { getInfoFromProtonDB } from 'backend/wiki_game_info/protondb/utils'
import { getSteamDeckComp } from 'backend/wiki_game_info/steamdeck/utils'
import { wikiGameInfoStore } from './electronStore'
import { removeSpecialcharacters } from '../utils'
import { SteamInfo, WikiInfo } from 'common/types'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { getInfoFromAppleGamingWiki } from './applegamingwiki/utils'
import { getHowLongToBeat } from './howlongtobeat/utils'
import { getInfoFromPCGamingWiki } from './pcgamingwiki/utils'
import { getUmuId } from './umu/utils'
import { isLinux, isMac } from 'backend/constants/environment'
import type { Game } from 'common/types/game_manager'

export async function getWikiGameInfo(game: Game): Promise<WikiInfo | null> {
  const gameInfo = game.getGameInfo()

  try {
    const title = removeSpecialcharacters(gameInfo.title)

    // check if we have a cached response
    const cachedResponse = wikiGameInfoStore.get(title)
    if (cachedResponse) {
      logInfo(
        [`Using cached WikiInfo data for ${title}`],
        LogPrefix.ExtraGameInfo
      )
      return cachedResponse
    }

    logInfo(`Getting WikiInfo data for ${title}`, LogPrefix.ExtraGameInfo)

    const [pcgamingwiki, gamesdb, applegamingwiki, umuId] = await Promise.all([
      getInfoFromPCGamingWiki(
        title,
        game.runner === 'gog' ? game.id : undefined
      ),
      getInfoFromGamesDB(title, game),
      isMac ? getInfoFromAppleGamingWiki(title) : null,
      isLinux ? getUmuId(game) : null
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

    wikiGameInfoStore.set(title, wikiGameInfo)

    return wikiGameInfo
  } catch (error) {
    logError(
      [`Was not able to get ExtraGameInfo data for ${gameInfo.title}`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}
