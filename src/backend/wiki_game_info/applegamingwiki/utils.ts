import { crossoverLinkIDRegEx } from './constants'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import axios from 'axios'
import { AppleGamingWikiInfo } from 'common/types'

export async function getInfoFromAppleGamingWiki(
  title: string
): Promise<AppleGamingWikiInfo | null> {
  try {
    // applegamingwiki does not like "-" and mostly replaces it with ":"
    title = title.replace(' -', ':')

    logInfo(
      `Getting AppleGamingWiki data for ${title}`,
      LogPrefix.ExtraGameInfo
    )

    const response = await getPageID(title)

    if (!response || !response.id) {
      return null
    }

    const wikitext = await getWikiText(response.id)

    return {
      crossoverRating: response.rating,
      crossoverLink: wikitext?.match(crossoverLinkIDRegEx)?.[1] ?? ''
    }
  } catch (error) {
    logError(
      [`Was not able to get AppleGamingWiki data for ${title}`, error],
      LogPrefix.ExtraGameInfo
    )
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
