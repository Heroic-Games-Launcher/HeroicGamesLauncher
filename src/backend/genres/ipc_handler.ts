import { addHandler } from 'backend/ipc'
import { getCache, loadCache, updateCache, forceRefreshCache } from './cache'

// Load cache from disk on startup
loadCache()

addHandler('getGenres', async () => {
  const cache = getCache()
  // If cache is empty, do an initial update
  if (Object.keys(cache).length === 0) {
    return updateCache()
  }
  return cache
})

addHandler('refreshGenres', async () => {
  return forceRefreshCache()
})
