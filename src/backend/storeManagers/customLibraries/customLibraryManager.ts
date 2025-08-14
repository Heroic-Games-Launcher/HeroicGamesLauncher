import { logInfo, logWarning } from 'backend/logger'
import { GlobalConfig } from 'backend/config'
import { LaunchOption } from 'common/types'
import { getWikiGameInfo } from 'backend/wiki_game_info/wiki_game_info'
import {
  getGamesdbData,
  gogToUnifiedInfo
} from 'backend/storeManagers/gog/library'
import { CustomLibraryTask } from 'backend/storeManagers/customLibraries/tasks/types'

interface GameMetadata {
  art_cover: string
  art_square: string
  description: string
  genres: string[]
}

interface CustomLibraryConfig {
  name: string
  games: Array<CustomLibraryConfigGame>
}

interface CustomLibraryConfigGame {
  app_name: string
  title: string
  executable: string
  art_cover?: string
  art_square?: string
  description?: string
  version?: string
  install_size_bytes?: number
  developer?: string
  release_date?: string
  platform?: 'windows' | 'mac' | 'linux' | 'browser'
  install_tasks: CustomLibraryTask[]
  uninstall_tasks: CustomLibraryTask[]
  gamesdb_credentials?: {
    store: string
    id: string
  }
  genres?: string[]
  launch_options?: LaunchOption[]
  launch_from_cmd?: boolean
}

const customLibraryCache: Map<string, CustomLibraryConfigGame> = new Map()

/**
 * Retrieves enhanced metadata (art, description, genres) for a custom library game
 * by fetching data from various sources including wiki info and games databases
 */
async function retrieveGameMetadata(
  game: CustomLibraryConfig['games'][0]
): Promise<GameMetadata> {
  let art_cover = game.art_cover || ''
  let art_square = game.art_square || game.art_cover || ''
  let description = game.description || ''
  let genres: string[] = []
  let storeId = ''
  let gameId = ''

  try {
    const fullWikiInfo = await getWikiGameInfo(
      game.title,
      `custom_${game.app_name}`,
      'customLibrary'
    )

    if (fullWikiInfo) {
      if (!art_cover && fullWikiInfo.howlongtobeat?.gameImageUrl) {
        art_cover = fullWikiInfo.howlongtobeat.gameImageUrl
        art_square = fullWikiInfo.howlongtobeat.gameImageUrl
      }

      genres = fullWikiInfo.pcgamingwiki?.genres || []

      if (fullWikiInfo.pcgamingwiki?.steamID) {
        storeId = 'steam'
        gameId = fullWikiInfo.pcgamingwiki?.steamID
      }
    }
  } catch (error) {
    logWarning(`Error getting wiki info for ${game.title}: ${error}`)
  }

  if (game.gamesdb_credentials) {
    storeId = game.gamesdb_credentials.store
    gameId = game.gamesdb_credentials.id
  }

  if (storeId && gameId) {
    try {
      logInfo(`Getting custom GamesDB data for ${game.title}`)
      const customGamesDBResult = await getGamesdbData(storeId, gameId)
      const unifiedInfo = await gogToUnifiedInfo(customGamesDBResult.data)

      if (unifiedInfo) {
        art_cover = unifiedInfo.art_cover
        art_square = unifiedInfo.art_square
        description = unifiedInfo.extra?.about?.description || ''
        genres = unifiedInfo.extra?.genres || []
      }
    } catch (error) {
      logWarning(
        `Failed to get custom GamesDB data for ${game.title}: ${error}`
      )
    }
  }

  return {
    art_cover,
    art_square,
    description,
    genres
  }
}

// Function to convert library name to a safe ID
function getLibraryId(libraryName: string): string {
  return libraryName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// Helper function to create unique app name
function createUniqueAppName(libraryName: string, appName: string): string {
  const libraryId = getLibraryId(libraryName)
  return `${libraryId}__${appName}`
}

// Function to fetch JSON data from URL
async function fetchLibraryData(
  url: string
): Promise<CustomLibraryConfig | null> {
  try {
    logInfo(`Fetching library data from: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      logWarning(
        `Failed to fetch from ${url}: HTTP ${response.status} ${response.statusText}`
      )
      return null
    }

    const data = await response.json()
    const libraryName = data.name || url.split('/').pop() || 'Unknown Library'
    logInfo(
      `Successfully fetched "${libraryName}" with ${data.games?.length || 0} games`
    )
    return data as CustomLibraryConfig
  } catch (error) {
    logWarning(`Error fetching from ${url}: ${error}`)
    return null
  }
}

async function getCustomLibraries(): Promise<CustomLibraryConfig[]> {
  const customLibraryUrls =
    GlobalConfig.get().getSettings().customLibraryUrls || []
  const customLibraryConfigs =
    GlobalConfig.get().getSettings().customLibraryConfigs || []
  const libraries: CustomLibraryConfig[] = []

  // Create a combined array of config promises
  const configPromises: Promise<{
    config: CustomLibraryConfig | null
    source: string
  }>[] = []

  // Add URL-based configs
  for (const libraryUrl of customLibraryUrls) {
    configPromises.push(
      fetchLibraryData(libraryUrl).then((config) => ({
        config,
        source: libraryUrl
      }))
    )
  }

  // Add direct JSON configs
  for (const jsonContent of customLibraryConfigs) {
    configPromises.push(
      Promise.resolve().then(() => {
        try {
          const data = JSON.parse(jsonContent)
          const libraryName = data.name || 'Custom JSON Library'
          logInfo(
            `Successfully parsed JSON config "${libraryName}" with ${data.games?.length || 0} games`
          )
          return { config: data as CustomLibraryConfig, source: 'JSON Config' }
        } catch (error) {
          logWarning(`Error parsing JSON config: ${error}`)
          return { config: null, source: 'JSON Config' }
        }
      })
    )
  }

  // Process all configs with the same logic
  const configResults = await Promise.allSettled(configPromises)

  for (const result of configResults) {
    if (result.status === 'rejected') {
      logWarning(`Error processing library config: ${result.reason}`)
      continue
    }

    const { config, source } = result.value

    if (!config) {
      logInfo(`Skipping ${source} - failed to load/parse data`)
      continue
    }

    const libraryName =
      config.name || source.split('/').pop() || 'Unknown Library'

    if (!config.games || !Array.isArray(config.games)) {
      logWarning(`Invalid or empty games array in ${libraryName}`)
      continue
    }

    // Skip if library name is already in libraries
    if (libraries.some((library) => library.name === config.name)) {
      logInfo(
        `Skipping ${source} - library name already exists: ${config.name}`
      )
      continue
    }

    for (const game of config.games) {
      // Create unique app name using library + original app name
      const uniqueAppName = createUniqueAppName(config.name, game.app_name)
      game.app_name = uniqueAppName

      // Check if game is already in cache with matching version
      const cachedGame = customLibraryCache.get(uniqueAppName)
      if (cachedGame && cachedGame.version === game.version) {
        logInfo(
          `Skipping metadata fetch for ${game.title} - already cached with matching version ${game.version}`
        )

        Object.assign(game, cachedGame)
        continue
      }

      // Retrieve and apply metadata for each game that's not cached or has version mismatch
      logInfo(
        `Fetching metadata for ${game.title} (version: ${game.version || 'unversioned'})`
      )
      const { art_cover, art_square, description, genres } =
        await retrieveGameMetadata(game)
      game.art_cover = art_cover
      game.art_square = art_square
      game.description = description
      game.genres = genres

      customLibraryCache.set(game.app_name, game)
    }

    libraries.push(config)
  }

  return libraries
}

function getCachedCustomLibraryEntry(
  appName: string
): CustomLibraryConfigGame | undefined {
  return customLibraryCache.get(appName)
}

export { getCustomLibraries, getCachedCustomLibraryEntry }
