import axios from 'axios'
import { SGDBGame, SGDBGrid } from 'common/types'

const SGDB_API_URL = 'https://www.steamgriddb.com/api/v2'

interface SGDBResponse<T> {
  success: boolean
  data: T
  errors?: string[]
}

/**
 * Search for a game using autocomplete.
 * @param apiKey SteamGridDB API Key
 * @param query Game name query
 * @returns List of games found
 */
export async function searchGame(
  apiKey: string,
  query: string
): Promise<SGDBGame[]> {
  const response = await axios.get<SGDBResponse<SGDBGame[]>>(
    `${SGDB_API_URL}/search/autocomplete/${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'HeroicBinaryUpdater/1.0'
      }
    }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Search failed')
  }

  return response.data.data
}

/**
 * Get grids for a specific game.
 * @param apiKey SteamGridDB API Key
 * @param args Request arguments
 * @returns List of grids
 */
export async function getGrids(
  apiKey: string,
  args: {
    gameId: number
    dimensions?: string[]
    styles?: string[]
  }
): Promise<SGDBGrid[]> {
  const params: Record<string, string> = {}
  if (args.dimensions && args.dimensions.length > 0) {
    params.dimensions = args.dimensions.join(',')
  }
  if (args.styles && args.styles.length > 0) {
    params.styles = args.styles.join(',')
  }

  const response = await axios.get<SGDBResponse<SGDBGrid[]>>(
    `${SGDB_API_URL}/grids/game/${args.gameId}`,
    {
      params,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'HeroicBinaryUpdater/1.0'
      }
    }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Failed to get grids')
  }

  return response.data.data
}
