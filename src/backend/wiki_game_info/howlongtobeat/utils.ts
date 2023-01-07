import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { HowLongToBeatEntry, HowLongToBeatService } from 'howlongtobeat'

export async function getHowLongToBeat(
  title: string,
  id: string
): Promise<HowLongToBeatEntry | null> {
  try {
    logInfo(`Getting HowLongToBeat data for ${title}`, LogPrefix.ExtraGameInfo)

    const hltb = new HowLongToBeatService()

    if (id) {
      // howlongtobeat package is broken for this function
      // he is scrapping the website and some layout changed
      // const result = await hltb.detail(id)
      // if (result) {
      //   return result
      // }
    }

    return (await hltb.search(title))[0]
  } catch (error) {
    logError(
      [`Was not able to get HowLongToBeat data for ${title}`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}
