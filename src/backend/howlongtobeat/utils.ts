import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
import { removeSpecialcharacters } from 'backend/utils'
import { HowLongToBeatEntry, HowLongToBeatService } from 'howlongtobeat'
import { howLongToBeatStore } from './electronStores'

export async function getHowLongToBeat(
  title: string
): Promise<HowLongToBeatEntry | null> {
  try {
    title = removeSpecialcharacters(title)

    // check if we have a cached response
    const cachedResponse = howLongToBeatStore.get(title)
    if (cachedResponse) {
      logInfo([`Using cached HowLongToBeat data for ${title}`, ''], {
        prefix: LogPrefix.Backend
      })
      return cachedResponse as HowLongToBeatEntry
    }

    logInfo(`Getting HowLongToBeat data for ${title}`, {
      prefix: LogPrefix.Backend
    })

    const hltb = new HowLongToBeatService()
    const results = await hltb.search(title)

    if (results.length > 0) {
      // cache response on electron store
      howLongToBeatStore.set(title, results[0])
    }

    return results[0]
  } catch (error) {
    logError(['Was not able to get HowLongToBeat data', error], {
      prefix: LogPrefix.Backend
    })
    return null
  }
}
