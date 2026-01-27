/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { GlobalConfig } from 'backend/config'
import { addHandler } from 'backend/ipc'
import { logError, LogPrefix } from 'backend/logger'

const SGDB = require('steamgriddb').default

addHandler('steamgriddb.searchGame', async (event, query) => {
  const { steamGridDbApiKey } = GlobalConfig.get().getSettings()
  if (!steamGridDbApiKey) {
    return []
  }

  const sgdb = new SGDB(steamGridDbApiKey)
  try {
    const results = await sgdb.searchGame(query)
    return results.map((game: { id: number; name: string }) => ({
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

  const sgdb = new SGDB(steamGridDbApiKey)
  try {
    const results = await sgdb.getGrids({
      id: args.gameId,
      type: 'game',
      dimensions: args.dimensions,
      styles: args.styles
    })
    return results.map(
      (grid: {
        id: number
        url: { toString: () => string }
        thumb: { toString: () => string }
      }) => ({
        id: grid.id,
        url: grid.url.toString(),
        thumb: grid.thumb.toString()
      })
    )
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
