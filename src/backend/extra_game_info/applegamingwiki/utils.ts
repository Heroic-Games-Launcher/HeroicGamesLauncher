import { crossoverLinkIDRegEx } from './constants'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { removeSpecialcharacters } from '../../utils'
import { appleGamingWikiInfoStore } from './electronStores'
import axios from 'axios'
import { AppleGamingWikiInfo } from 'common/types'

export async function getInfoFromAppleGamingWiki(
  title: string
): Promise<AppleGamingWikiInfo | null> {
  try {
    title = removeSpecialcharacters(title)

    // pcgamingwiki does not like "-" and mostly replaces it with ":"
    title = title.replace(' -', ':')

    // check if we have a cached response
    const cachedResponse = appleGamingWikiInfoStore.get(
      title
    ) as AppleGamingWikiInfo
    if (cachedResponse) {
      logInfo([`Using cached applegamingwiki data for ${title}`], {
        prefix: LogPrefix.ExtraGameInfo
      })

      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      const timestampLastFetch = new Date(cachedResponse.timestampLastFetch)
      if (timestampLastFetch > oneMonthAgo) {
        return cachedResponse
      }

      logInfo([`Cached applegamingwiki data for ${title} outdated.`], {
        prefix: LogPrefix.ExtraGameInfo
      })
    }

    logInfo(`Getting applegamingwiki data for ${title}`, {
      prefix: LogPrefix.ExtraGameInfo
    })

    const response = await getPageID(title)

    if (!response || !response.id) {
      return null
    }

    const wikitext = await getWikiText(response.id)

    const appleGamingWikiInfo: AppleGamingWikiInfo = {
      timestampLastFetch: Date(),
      crossoverRating: response.rating,
      crossoverLink: wikitext?.match(crossoverLinkIDRegEx)?.[1] ?? ''
    }

    appleGamingWikiInfoStore.set(title, appleGamingWikiInfo)

    return appleGamingWikiInfo
  } catch (error) {
    logError([`Was not able to get applegamingwiki data for ${title}`, error], {
      prefix: LogPrefix.ExtraGameInfo
    })
    return null
  }
}

interface PageReturn {
  id: string
  rating: string
}

async function getPageID(title: string): Promise<PageReturn> {
  const { data } = await axios.get(
    `https://www.applegamingwiki.com/w/api.php?action=cargoquery&tables=Compatibility_macOS&fields=Compatibility_macOS._pageID%3DpageID%2C+Compatibility_macOS.crossover%3Dcrossover%2C&where=Compatibility_macOS._pageName%3D"${title.replaceAll(
      ' ',
      '%20'
    )}"&format=json`
  )

  return {
    id: data.cargoquery[0]?.title?.pageID,
    rating: data.cargoquery[0]?.title?.crossover
  }
}

async function getWikiText(id: string): Promise<string | null> {
  const { data } = await axios.get(
    `https://www.applegamingwiki.com/w/api.php?action=parse&format=json&pageid=${id}&redirects=true&prop=wikitext`
  )

  if (!data.parse.wikitext || !data.parse.wikitext['*']) {
    return null
  }

  return data.parse.wikitext['*']
}
