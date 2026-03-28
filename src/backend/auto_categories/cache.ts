import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { appFolder } from 'backend/constants/paths'
import { logError, logInfo, logWarning, LogPrefix } from 'backend/logger'
import { axiosClient } from 'backend/utils'
import { gameManagerMap } from 'backend/storeManagers/index'
import { libraryStore as legendaryLibraryStore } from 'backend/storeManagers/legendary/electronStores'
import { libraryStore as gogLibraryStore } from 'backend/storeManagers/gog/electronStores'
import { libraryStore as nileLibraryStore } from 'backend/storeManagers/nile/electronStores'
import { libraryStore as zoomLibraryStore } from 'backend/storeManagers/zoom/electronStores'
import { libraryStore as sideloadLibraryStore } from 'backend/storeManagers/sideload/electronStores'
import { GameInfo } from 'common/types'

const AUTO_CATEGORIES_PATH = join(appFolder, 'auto_categories.json')
const PCGW_API = 'https://www.pcgamingwiki.com/w/api.php'
const BATCH_SIZE = 50

// gameId (appName_runner) -> genres[]
export type AutoCategoriesCache = Record<string, string[]>

let cache: AutoCategoriesCache = {}

export function loadCache(): AutoCategoriesCache {
  try {
    if (existsSync(AUTO_CATEGORIES_PATH)) {
      const raw = readFileSync(AUTO_CATEGORIES_PATH, 'utf-8')
      cache = JSON.parse(raw)
    }
  } catch (error) {
    logError(
      ['Failed to load auto-categories cache', error],
      LogPrefix.ExtraGameInfo
    )
    cache = {}
  }
  return cache
}

function saveCache() {
  try {
    writeFileSync(AUTO_CATEGORIES_PATH, JSON.stringify(cache, null, 2))
  } catch (error) {
    logError(
      ['Failed to save auto-categories cache', error],
      LogPrefix.ExtraGameInfo
    )
  }
}

export function getCache(): AutoCategoriesCache {
  return cache
}

function getAllGames(): GameInfo[] {
  const allGames: GameInfo[] = []

  try {
    allGames.push(...legendaryLibraryStore.get('library', []))
  } catch {
    // store not available
  }

  try {
    allGames.push(...gogLibraryStore.get('games', []))
  } catch {
    // store not available
  }

  try {
    allGames.push(...nileLibraryStore.get('library', []))
  } catch {
    // store not available
  }

  try {
    allGames.push(...zoomLibraryStore.get('games', []))
  } catch {
    // store not available
  }

  try {
    allGames.push(...sideloadLibraryStore.get('games', []))
  } catch {
    // store not available
  }

  return allGames
}

/**
 * Fetch genres from PCGamingWiki for a batch of game titles using the
 * MediaWiki categories API.
 *
 * The API returns categories like "Category:Action games" - we strip the
 * "Category:" prefix and " games" suffix to get clean genre names.
 */
async function fetchGenresFromPCGW(
  titles: string[]
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {}

  // Process in batches of BATCH_SIZE (MediaWiki API limit for titles param)
  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE)
    const titlesParam = batch.map((t) => encodeURI(t)).join('|')

    try {
      const { data } = await axiosClient.get(PCGW_API, {
        params: {
          action: 'query',
          prop: 'categories',
          titles: titlesParam,
          cllimit: 'max',
          // clcategories:
          //   'Category:Action games|Category:Adventure games|Category:Arcade games|Category:Board games|Category:Card games|Category:Casino games|Category:Comedy games|Category:Dating simulation games|Category:Educational games|Category:Fighting games|Category:FPS games|Category:Hack and slash games|Category:Horror games|Category:Idle games|Category:Immersive sim games|Category:Interactive fiction games|Category:MMORPG games|Category:MOBA games|Category:Music games|Category:Open world games|Category:Party games|Category:Pinball games|Category:Platform games|Category:Puzzle games|Category:Racing games|Category:Real-time strategy games|Category:Roguelike games|Category:Role-playing games|Category:Sandbox games|Category:Shooter games|Category:Simulation games|Category:Sports games|Category:Stealth games|Category:Strategy games|Category:Survival games|Category:Tactical shooter games|Category:Tower defense games|Category:Turn-based strategy games|Category:Turn-based tactics games|Category:Visual novel games',
          format: 'json'
        },
        timeout: 30000
      })

      if (data?.query?.pages) {
        const pages: Record<
          string,
          { title: string; categories?: Array<{ title: string }> }
        > = data.query.pages
        for (const page of Object.values(pages)) {
          if (page.categories && page.categories.length > 0) {
            const genres = page.categories
              .map((cat) =>
                cat.title
                  .replace('Category:', '')
                  .replace(/ games$/i, '')
              )
              .filter((g) => g.length > 0)
            if (genres.length > 0) {
              result[page.title] = genres
            }
          }
        }
      }
    } catch (error) {
      logWarning(
        [
          `Failed to fetch PCGamingWiki genres for batch starting at index ${i}`,
          error
        ],
        LogPrefix.ExtraGameInfo
      )
    }
  }

  return result
}

/**
 * For a game, try to resolve genres from:
 * 1. GameInfo.extra.genres (GOG, Amazon/Nile provide these)
 * 2. Runner's getExtraInfo
 * 3. PCGamingWiki API (fallback for Epic/others)
 */
async function resolveGenresForGames(
  games: GameInfo[],
  forceRefresh: boolean
): Promise<void> {
  const needsPcgw: GameInfo[] = []

  await Promise.all(games.map(async game => {
    const gameId = `${game.app_name}_${game.runner}`

    if (!forceRefresh && cache[gameId] && cache[gameId].length > 0) {
      return;
    }

    if (!['gog', 'nile'].includes(game.runner)) {
      needsPcgw.push(game);
      return;
    };

    // Try to get genres from the game's extra info
    let genres: string[] = []
    if (game.extra?.genres && game.extra.genres.length > 0) {
      genres = game.extra.genres.filter((g) => g && g.trim() !== '')
    }

    if (genres.length > 0) {
      cache[gameId] = genres
      return;
    }
    // Try getting extra info from the runner
    try {
      const extraInfo = await gameManagerMap[game.runner].getExtraInfo(
        game.app_name
      )
      if (
        extraInfo?.genres &&
        extraInfo.genres.length > 0 &&
        extraInfo.genres[0] !== ''
      ) {
        cache[gameId] = extraInfo.genres
        return;
      }
    } catch {
      // getExtraInfo not available for this runner
    }
    needsPcgw.push(game)
  }));

  if (needsPcgw.length === 0) {
    return
  }

  logInfo(
    `Fetching genres from PCGamingWiki for ${needsPcgw.length} games`,
    LogPrefix.ExtraGameInfo
  )

  const titles = needsPcgw.map((g) => g.title)
  const pcgwGenres = await fetchGenresFromPCGW(titles)

  // Map PCGW results back to game IDs via case-insensitive title matching
  const pcgwTitleMap = new Map<string, string[]>()
  for (const [title, genres] of Object.entries(pcgwGenres)) {
    pcgwTitleMap.set(title.toLowerCase(), genres)
  }

  for (const game of needsPcgw) {
    const gameId = `${game.app_name}_${game.runner}`
    const normalizedTitle = game.title.replace(/ -/g, ':').toLowerCase()
    const genres =
      pcgwTitleMap.get(normalizedTitle) ||
      pcgwTitleMap.get(game.title.toLowerCase())

    if (genres && genres.length > 0) {
      cache[gameId] = genres
    }
  }
}

/**
 * Update the cache for all games in the library.
 * Only fetches genres for games not already in the cache.
 */
export async function updateCache(): Promise<AutoCategoriesCache> {
  logInfo('Updating auto-categories cache', LogPrefix.ExtraGameInfo)

  loadCache()
  const allGames = getAllGames()

  const uncachedGames = allGames.filter((game) => {
    const gameId = `${game.app_name}_${game.runner}`
    return !cache[gameId] || cache[gameId].length === 0
  })

  if (uncachedGames.length === 0) {
    logInfo('All games already have genres cached', LogPrefix.ExtraGameInfo)
    return cache
  }

  logInfo(
    `Resolving genres for ${uncachedGames.length} uncached games`,
    LogPrefix.ExtraGameInfo
  )

  await resolveGenresForGames(uncachedGames, false)
  saveCache()

  logInfo(
    `Auto-categories cache updated. ${Object.keys(cache).length} games cached.`,
    LogPrefix.ExtraGameInfo
  )

  return cache
}

/**
 * Force refresh the entire cache - re-fetches genres for all games.
 */
export async function forceRefreshCache(): Promise<AutoCategoriesCache> {
  logInfo('Force refreshing auto-categories cache', LogPrefix.ExtraGameInfo)

  cache = {}
  const allGames = getAllGames()

  await resolveGenresForGames(allGames, true)
  saveCache()

  logInfo(
    `Auto-categories cache rebuilt. ${Object.keys(cache).length} games cached.`,
    LogPrefix.ExtraGameInfo
  )

  return cache
}
