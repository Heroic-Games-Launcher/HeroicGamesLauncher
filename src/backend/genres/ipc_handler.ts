import { addHandler } from 'backend/ipc'
import { loadCache, updateCache, forceRefreshCache } from './cache'

// Load cache from disk on startup
loadCache()

addHandler('getGenres', async () => {
  return updateCache()
})

addHandler('refreshGenres', async () => {
  return forceRefreshCache()
})
