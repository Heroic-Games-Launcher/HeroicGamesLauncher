import { TypeCheckedStoreBackend } from 'backend/electron_store'
import { logInfo, LogPrefix } from 'backend/logger'
import { gameManagerMap } from 'backend/storeManagers/index'
import { libraryStore as legendaryLibraryStore } from 'backend/storeManagers/legendary/electronStores'
import { libraryStore as gogLibraryStore } from 'backend/storeManagers/gog/electronStores'
import { libraryStore as nileLibraryStore } from 'backend/storeManagers/nile/electronStores'
import { libraryStore as zoomLibraryStore } from 'backend/storeManagers/zoom/electronStores'
import { libraryStore as sideloadLibraryStore } from 'backend/storeManagers/sideload/electronStores'
import {
  getPageID,
  fetchGenresByTitles,
  fetchGenresByPageIds
} from 'backend/wiki_game_info/pcgamingwiki/utils'
import { GameInfo } from 'common/types'

// gameId (appName_runner) -> genres[]
type GenresCache = Record<string, string[]>

const genresStore = new TypeCheckedStoreBackend('genresStore', {
  cwd: 'genres_store',
  name: 'cache',
  clearInvalidConfig: true
})

export function getCache(): GenresCache {
  return genresStore.raw_store
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

  await Promise.all(
    games.map(async (game) => {
      const gameId = `${game.app_name}_${game.runner}`

      if (!forceRefresh && genresStore.get(gameId, []).length > 0) {
        return
      }

      if (!['gog', 'nile'].includes(game.runner)) {
        needsPcgw.push(game)
        return
      }

      // Try to get genres from the game's extra info
      let genres: string[] = []
      if (game.extra?.genres && game.extra.genres.length > 0) {
        genres = game.extra.genres.filter((g) => g && g.trim() !== '')
      }

      if (genres.length > 0) {
        genresStore.set(gameId, genres)
        return
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
          genresStore.set(gameId, extraInfo.genres)
          return
        }
      } catch {
        // getExtraInfo not available for this runner
      }
      needsPcgw.push(game)
    })
  )

  if (needsPcgw.length === 0) {
    return
  }

  logInfo(
    `Fetching genres from PCGamingWiki for ${needsPcgw.length} games`,
    LogPrefix.ExtraGameInfo
  )

  // Non-GOG games: batch-fetch genres by title
  const otherGames = needsPcgw.filter((g) => g.runner !== 'gog')
  if (otherGames.length > 0) {
    const titles = otherGames.map((g) => g.title)
    const pcgwGenres = await fetchGenresByTitles(titles)

    const pcgwTitleMap = new Map<string, string[]>()
    for (const [title, genres] of Object.entries(pcgwGenres)) {
      pcgwTitleMap.set(title.toLowerCase(), genres)
    }

    for (const game of otherGames) {
      const gameId = `${game.app_name}_${game.runner}`
      const normalizedTitle = game.title.replace(/ -/g, ':').toLowerCase()
      const genres =
        pcgwTitleMap.get(normalizedTitle) ||
        pcgwTitleMap.get(game.title.toLowerCase())
      if (genres && genres.length > 0) {
        genresStore.set(gameId, genres)
      }
    }
  }

  // GOG games: resolve page IDs via GOG ID, then batch-fetch genres
  const gogGames = needsPcgw.filter((g) => g.runner === 'gog')
  if (gogGames.length > 0) {
    const gameIdToPageId = new Map<string, string>()

    for (const game of gogGames) {
      const gameId = `${game.app_name}_${game.runner}`
      try {
        const pageId = await getPageID(
          game.title.replace(/ -/g, ':'),
          game.app_name
        )
        if (pageId) {
          gameIdToPageId.set(gameId, String(pageId))
        }
      } catch {
        // Failed to resolve page ID for this game
      }
    }

    if (gameIdToPageId.size > 0) {
      const uniquePageIds = [...new Set(gameIdToPageId.values())]
      const genresByPageId = await fetchGenresByPageIds(uniquePageIds)

      for (const [gameId, pageId] of gameIdToPageId) {
        const genres = genresByPageId[pageId]
        if (genres && genres.length > 0) {
          genresStore.set(gameId, genres)
        }
      }
    }
  }
}

/**
 * Update the cache for all games in the library.
 * Only fetches genres for games not already in the cache.
 */
export async function updateCache(): Promise<GenresCache> {
  logInfo('Updating genres cache', LogPrefix.ExtraGameInfo)

  const allGames = getAllGames()

  const uncachedGames = allGames.filter((game) => {
    const gameId = `${game.app_name}_${game.runner}`
    return genresStore.get(gameId, []).length === 0
  })

  if (uncachedGames.length === 0) {
    logInfo('All games already have genres cached', LogPrefix.ExtraGameInfo)
    return genresStore.raw_store
  }

  logInfo(
    `Resolving genres for ${uncachedGames.length} uncached games`,
    LogPrefix.ExtraGameInfo
  )

  await resolveGenresForGames(uncachedGames, false)

  logInfo(
    `Genres cache updated. ${Object.keys(genresStore.raw_store).length} games cached.`,
    LogPrefix.ExtraGameInfo
  )

  return genresStore.raw_store
}

/**
 * Force refresh the entire cache - re-fetches genres for all games.
 */
export async function forceRefreshCache(): Promise<GenresCache> {
  logInfo('Force refreshing genres cache', LogPrefix.ExtraGameInfo)

  genresStore.clear()
  const allGames = getAllGames()

  await resolveGenresForGames(allGames, true)

  logInfo(
    `Genres cache rebuilt. ${Object.keys(genresStore.raw_store).length} games cached.`,
    LogPrefix.ExtraGameInfo
  )

  return genresStore.raw_store
}
