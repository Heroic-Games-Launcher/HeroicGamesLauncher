import {
  direct3DVersionsRegEx,
  howLongToBeatIDRegEx,
  idgbRegEx,
  metacriticRegEx,
  opencriticRegEx,
  steamIDRegEx
} from './constants'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { removeSpecialcharacters } from '../../utils'
import { pcGamingWikiInfoStore } from './electronStores'
import axios from 'axios'
import { PCGamingWikiInfo } from 'common/types'

export async function getInfoFromPCGamingWiki(
  title: string,
  gogID?: string
): Promise<PCGamingWikiInfo | null> {
  try {
    title = removeSpecialcharacters(title)

    // check if we have a cached response
    const cachedResponse = pcGamingWikiInfoStore.get(title)
    if (cachedResponse) {
      logInfo([`Using cached pcgamingwiki data for ${title}`, ''], {
        prefix: LogPrefix.ExtraGameInfo
      })
      return cachedResponse as PCGamingWikiInfo
    }

    logInfo(`Getting pcgamingwiki data for ${title}`, {
      prefix: LogPrefix.ExtraGameInfo
    })

    const id = await getPageID(title, gogID)

    if (!id) {
      return null
    }

    const wikitext = await getWikiText(id)

    if (!wikitext) {
      return null
    }

    const metacritic = wikitext.match(metacriticRegEx)?.[1] ?? '?'
    const opencritic = wikitext.match(opencriticRegEx)?.[1] ?? '?'
    const igdb = wikitext.match(idgbRegEx)?.[1] ?? '?'
    const steamID = wikitext.match(steamIDRegEx)?.[1] ?? '?'
    const howLongToBeatID = wikitext.match(howLongToBeatIDRegEx)?.[1] ?? '?'
    const direct3DVersions = wikitext.match(direct3DVersionsRegEx)?.[1] ?? '?'

    const pcGamingWikiInfo: PCGamingWikiInfo = {
      steamID,
      howLongToBeatID,
      metacritic,
      opencritic,
      igdb,
      direct3DVersions: direct3DVersions.replaceAll(' ', '').split(',')
    }

    pcGamingWikiInfoStore.set(title, pcGamingWikiInfo)

    return pcGamingWikiInfo
  } catch (error) {
    logError([`Was not able to get pcgamingwiki data for ${title}`, error], {
      prefix: LogPrefix.ExtraGameInfo
    })
    return null
  }
}

async function getPageID(title: string, id?: string): Promise<string | null> {
  if (id) {
    const { data } = await axios.get(
      `https://www.pcgamingwiki.com/w/api.php?action=cargoquery&tables=Infobox_game&fields=Infobox_game._pageID%3DpageID%2C&where=Infobox_game.GOGcom_ID%20HOLDS%20${id}&format=json`
    )

    const number = data.cargoquery[0]?.title?.pageID

    if (number) {
      return number
    }
  }

  const { data } = await axios.get(
    `https://www.pcgamingwiki.com/w/api.php?action=cargoquery&tables=_pageData&fields=_pageData._pageID%3DpageID%2C&where=_pageData._pageName%3D"${title.replaceAll(
      ' ',
      '%20'
    )}"&format=json`
  )

  return data.cargoquery[0]?.title?.pageID
}

async function getWikiText(id: string): Promise<string | null> {
  const { data } = await axios.get(
    `https://www.pcgamingwiki.com/w/api.php?action=parse&format=json&pageid=${id}&redirects=true&prop=wikitext`
  )

  if (!data.parse.wikitext || !data.parse.wikitext['*']) {
    return null
  }

  return data.parse.wikitext['*']
}
