import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { removeSpecialcharacters } from '../../utils'
import { gameScoreStore } from './electronStores'
import { AllData, getData } from 'what-to-play/build/api'

export async function getGameScore(title: string): Promise<AllData | null> {
  try {
    title = removeSpecialcharacters(title)

    // check if we have a cached response
    const cachedResponse = gameScoreStore.get(title)
    if (cachedResponse) {
      logInfo([`Using cached game score data for ${title}`, ''], {
        prefix: LogPrefix.ExtraGameInfo
      })
      return cachedResponse as AllData
    }

    logInfo(`Getting game score data for ${title}`, {
      prefix: LogPrefix.ExtraGameInfo
    })

    return await getData(title, ['pc'], 'US')
  } catch (error) {
    logError(['Was not able to get game score data', error], {
      prefix: LogPrefix.ExtraGameInfo
    })
    return null
  }
}
