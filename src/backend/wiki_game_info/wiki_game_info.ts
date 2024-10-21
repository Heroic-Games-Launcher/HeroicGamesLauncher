import { getInfoFromGamesDB } from 'backend/wiki_game_info/gamesdb/utils'
import { getInfoFromProtonDB } from 'backend/wiki_game_info/protondb/utils'
import { getSteamDeckComp } from 'backend/wiki_game_info/steamdeck/utils'
import { wikiGameInfoStore } from './electronStore'
import { removeSpecialcharacters } from '../utils'
import { Runner, SteamInfo, WikiInfo } from 'common/types'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { getInfoFromAppleGamingWiki } from './applegamingwiki/utils'
import { getHowLongToBeat } from './howlongtobeat/utils'
import { getInfoFromPCGamingWiki } from './pcgamingwiki/utils'
import { isMac, isLinux } from '../constants'
import { getUmuId } from './umu/utils'

export async function getWikiGameInfo(
  title: string,
  appName: string,
  runner: Runner
): Promise<WikiInfo | null> {
  try {
    title = removeSpecialcharacters(title)

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

    const [pcgamingwiki, howlongtobeat, gamesdb, applegamingwiki, umuId] =
      await Promise.all([
        getInfoFromPCGamingWiki(title, runner === 'gog' ? appName : undefined),
        getHowLongToBeat(title),
        getInfoFromGamesDB(title, appName, runner),
        isMac ? getInfoFromAppleGamingWiki(title) : null,
        isLinux ? getUmuId(appName, runner) : null
      ])

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
