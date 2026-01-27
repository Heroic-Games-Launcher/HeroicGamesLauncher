import { GlobalConfig } from 'backend/config'
import { addHandler } from 'backend/ipc'
import { logError, LogPrefix } from 'backend/logger'
import * as SteamGridDB from './utils'

addHandler('steamgriddb.searchGame', async (event, query) => {
  const { steamGridDbApiKey } = GlobalConfig.get().getSettings()
  if (!steamGridDbApiKey) {
    return []
  }

  try {
    const results = await SteamGridDB.searchGame(steamGridDbApiKey, query)
    return results.map((game) => ({
      id: game.id,
      name: game.name
    }))
  } catch (error) {
    logError(['SteamGridDB search failed:', error], LogPrefix.Backend)
    return []
  }
})

addHandler('steamgriddb.getGrids', async (event, args) => {
  const { steamGridDbApiKey } = GlobalConfig.get().getSettings()
  if (!steamGridDbApiKey) {
    return []
  }

  try {
    const results = await SteamGridDB.getGrids(steamGridDbApiKey, {
      gameId: args.gameId,
      dimensions: args.dimensions,
      styles: args.styles
    })
    return results.map((grid) => ({
      id: grid.id,
      url: grid.url,
      thumb: grid.thumb
    }))
  } catch (error) {
    const errorMessage =
      (
        error as { response?: { data?: { errors?: string[] } } }
      ).response?.data?.errors?.join(', ') || (error as Error).message
    logError(
      [`SteamGridDB getGrids failed: ${errorMessage}`, error],
      LogPrefix.Backend
    )
    return []
  }
})
