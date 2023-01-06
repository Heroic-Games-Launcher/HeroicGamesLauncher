import { wikiGameInfoStore } from './electronStore'
import { removeSpecialcharacters } from '../utils'
import { WikiInfo } from '../../common/types'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { getInfoFromAppleGamingWiki } from './applegamingwiki/utils'
import { getHowLongToBeat } from './howlongtobeat/utils'
import { getInfoFromPCGamingWiki } from './pcgamingwiki/utils'

export async function getWikiGameInfo(
  title: string,
  gogID?: string
): Promise<WikiInfo | null> {
  try {
    title = removeSpecialcharacters(title)

    // check if we have a cached response
    const cachedResponse = wikiGameInfoStore.get(title) as WikiInfo
    if (cachedResponse) {
      logInfo(
        [`Using cached ExtraGameInfo data for ${title}`],
        LogPrefix.ExtraGameInfo
      )

      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      const timestampLastFetch = new Date(cachedResponse.timestampLastFetch)
      if (timestampLastFetch > oneMonthAgo) {
        return cachedResponse
      }

      logInfo(
        [`Cached ExtraGameInfo data for ${title} outdated.`],
        LogPrefix.ExtraGameInfo
      )
    }

    logInfo(`Getting ExtraGameInfo data for ${title}`, LogPrefix.ExtraGameInfo)

    const pcgamingwiki = await getInfoFromPCGamingWiki(title, gogID)
    const applegamingwiki = await getInfoFromAppleGamingWiki(title)
    const howlongtobeat = await getHowLongToBeat(
      title,
      pcgamingwiki?.howLongToBeatID ?? ''
    )

    return {
      timestampLastFetch: Date(),
      pcgamingwiki,
      applegamingwiki,
      howlongtobeat
    }
  } catch (error) {
    logError(
      [`Was not able to get ExtraGameInfo data for ${title}`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}
