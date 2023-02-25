import {
  crossoverLinkIDRegEx,
  crossoverRatingRegEx,
  wineRatingRegEx
} from './constants'
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

    const id = await getPageID(title)

    if (!id) {
      return null
    }

    const wikitext = await getWikiText(id)

    return {
      crossoverRating: wikitext?.match(crossoverRatingRegEx)?.[1] ?? '',
      wineRating: wikitext?.match(wineRatingRegEx)?.[1] ?? '',
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

async function getPageID(title: string): Promise<string> {
  const { data } = await axios.get(
    `https://www.applegamingwiki.com/w/api.php?action=query&list=search&srsearch=${title.replaceAll(
      ' ',
      '%20'
    )}&format=json`
  )

  return data.query.search[0]?.pageid
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
