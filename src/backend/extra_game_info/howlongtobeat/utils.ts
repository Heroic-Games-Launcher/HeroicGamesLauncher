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
    const cachedResponse = howLongToBeatStore.get_nodefault(title)
    if (cachedResponse) {
      logInfo(['Using cached HowLongToBeat data for', title], LogPrefix.Backend)
      return cachedResponse
    }

    logInfo(['Getting HowLongToBeat data for', title], LogPrefix.Backend)

    const hltb = new HowLongToBeatService()
    const result = (await hltb.search(title)).at(0)

    if (result) howLongToBeatStore.set(title, result)

    return result ?? null
  } catch (error) {
    logError(
      ['Was not able to get HowLongToBeat data', error],
      LogPrefix.Backend
    )
    return null
  }
}
