import {
  direct3DVersionsRegEx,
  genresRegEx,
  howLongToBeatIDRegEx,
  idgbRegEx,
  metacriticRegEx,
  opencriticRegEx,
  releaseDateRegEx,
  steamIDRegEx
} from './constants'
import { logError, logInfo, logWarning, LogPrefix } from 'backend/logger'
import { GameScoreInfo, PCGamingWikiInfo } from 'common/types'
import { axiosClient } from 'backend/utils'

const PCGW_API = 'https://www.pcgamingwiki.com/w/api.php'
const BATCH_SIZE = 50

export async function getInfoFromPCGamingWiki(
  title: string,
  gogID?: string
): Promise<PCGamingWikiInfo | null> {
  try {
    // pcgamingwiki does not like "-" and mostly replaces it with ":"
    title = title.replace(' -', ':')

    logInfo(`Getting PCGamingWiki data for ${title}`, LogPrefix.ExtraGameInfo)

    const id = await getPageID(title, gogID)

    if (!id) {
      return null
    }

    const wikitext = await getWikiText(id)

    if (!wikitext) {
      return null
    }
    const metacritic = getGameScore(wikitext, metacriticRegEx)
    const opencritic = getGameScore(wikitext, opencriticRegEx)
    const igdb = getGameScore(wikitext, idgbRegEx)
    const steamID = wikitext.match(steamIDRegEx)?.[1] ?? ''
    const howLongToBeatID = wikitext.match(howLongToBeatIDRegEx)?.[1] ?? ''
    const direct3DVersions = wikitext.match(direct3DVersionsRegEx)?.[1] ?? ''
    const genres = wikitext.match(genresRegEx)?.[1] ?? ''

    const releaseDates = getReleaseDates(wikitext)

    return {
      steamID,
      howLongToBeatID,
      metacritic,
      opencritic,
      igdb,
      direct3DVersions: direct3DVersions.replaceAll(' ', '').split(','),
      genres: genres.replaceAll(' ', '').split(','),
      releaseDate: releaseDates
    }
  } catch (error) {
    logError(
      [`Was not able to get PCGamingWiki data for ${title}`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}

function getReleaseDates(wikitext: string) {
  const releaseDates = []
  const matches = wikitext.matchAll(releaseDateRegEx)
  for (const match of matches) {
    releaseDates.push(`${match[1]}: ${match[2]}`)
  }
  return releaseDates
}

export async function getPageID(
  title: string,
  id?: string
): Promise<string | null> {
  if (id) {
    const { data } = await axiosClient.get(
      `https://www.pcgamingwiki.com/w/api.php?action=cargoquery&tables=Infobox_game&fields=Infobox_game._pageID%3DpageID%2C&where=Infobox_game.GOGcom_ID%20HOLDS%20${id}&format=json`
    )

    const number = data.cargoquery[0]?.title?.pageID

    if (number) {
      return number
    }
  }

  const { data } = await axiosClient.get(
    `https://www.pcgamingwiki.com/w/api.php?action=query&list=search&srsearch=${title.replaceAll(
      ' ',
      '%20'
    )}&format=json`
  )

  return data.query.search[0]?.pageid
}

async function getWikiText(id: string): Promise<string | null> {
  const { data } = await axiosClient.get(
    `https://www.pcgamingwiki.com/w/api.php?action=parse&format=json&pageid=${id}&redirects=true&prop=wikitext`
  )

  if (!data.parse.wikitext || !data.parse.wikitext['*']) {
    return null
  }

  return data.parse.wikitext['*']
}

function getGameScore(text: string, regex: RegExp): GameScoreInfo {
  const regexMatch = text.match(regex)

  return {
    score: regexMatch?.[2] ?? '',
    urlid: regexMatch?.[1] ?? ''
  }
}

function parseGenresFromCategories(
  categories: Array<{ title: string }>
): string[] {
  return categories
    .map((cat) => cat.title.replace('Category:', '').replace(/ games$/i, ''))
    .filter((g) => g.length > 0)
}

/**
 * Batch-fetch genres from PCGamingWiki using page titles.
 *
 * Batches are processed sequentially to avoid overwhelming the API.
 * Returns a map of page title -> genre names.
 */
export async function fetchGenresByTitles(
  titles: string[]
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {}

  const batches: string[][] = []
  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    batches.push(titles.slice(i, i + BATCH_SIZE))
  }

  for (let index = 0; index < batches.length; index++) {
    const titlesParam = batches[index]
      .map((t) => t.replace(/ -/g, ':'))
      .join('|')

    try {
      const { data } = await axiosClient.get(PCGW_API, {
        params: {
          action: 'query',
          prop: 'categories',
          titles: titlesParam,
          cllimit: 'max',
          format: 'json'
        },
        timeout: 30000
      })

      if (data?.query?.pages) {
        const pages: Record<
          string,
          { title: string; categories?: Array<{ title: string }> }
        > = data.query.pages
        Object.values(pages).forEach((page) => {
          if (!page.categories?.length) return
          const genres = parseGenresFromCategories(page.categories)
          if (genres.length > 0) {
            result[page.title] = genres
          }
        })
      }
    } catch (error) {
      logWarning(
        [
          `Failed to fetch PCGamingWiki genres for batch starting at index ${index}`,
          error
        ],
        LogPrefix.ExtraGameInfo
      )
    }
  }

  return result
}

/**
 * Batch-fetch genres from PCGamingWiki using page IDs.
 *
 * Batches are processed sequentially to avoid overwhelming the API.
 * Returns a map of pageId -> genre names.
 */
export async function fetchGenresByPageIds(
  pageIds: string[]
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {}

  const batches: string[][] = []
  for (let i = 0; i < pageIds.length; i += BATCH_SIZE) {
    batches.push(pageIds.slice(i, i + BATCH_SIZE))
  }

  for (let index = 0; index < batches.length; index++) {
    try {
      const { data } = await axiosClient.get(PCGW_API, {
        params: {
          action: 'query',
          prop: 'categories',
          pageids: batches[index].join('|'),
          cllimit: 'max',
          format: 'json'
        },
        timeout: 30000
      })

      if (data?.query?.pages) {
        const pages: Record<string, { categories?: Array<{ title: string }> }> =
          data.query.pages
        Object.entries(pages).forEach(([pageId, page]) => {
          if (!page.categories?.length) return
          const genres = parseGenresFromCategories(page.categories)
          if (genres.length > 0) {
            result[pageId] = genres
          }
        })
      }
    } catch (error) {
      logWarning(
        [
          `Failed to fetch PCGamingWiki genres for batch starting at index ${index}`,
          error
        ],
        LogPrefix.ExtraGameInfo
      )
    }
  }

  return result
}
