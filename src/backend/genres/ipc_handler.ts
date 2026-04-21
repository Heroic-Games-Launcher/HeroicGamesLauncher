import { addHandler } from 'backend/ipc'
import { updateCache, forceRefreshCache } from './cache'

addHandler('getGenres', async () => {
  return updateCache()
})

addHandler('refreshGenres', async () => {
  return forceRefreshCache()
})
