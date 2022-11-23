import { logError, LogPrefix } from 'backend/logger/logger'
import { HowLongToBeatEntry, HowLongToBeatService } from 'howlongtobeat'

export async function getHowLongToBeat(
  title: string
): Promise<HowLongToBeatEntry | null> {
  try {
    const hltb = new HowLongToBeatService()
    const results = await hltb.search(title)
    return results[0]
  } catch (error) {
    logError(['Was not able to get HowLongToBeat data', error], {
      prefix: LogPrefix.Backend
    })
    return null
  }
}
