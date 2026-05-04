import { addHandler } from 'backend/ipc'
import {
  getGameRatings,
  getLibraryRatings,
  refreshLibraryRatings,
  setApiKey
} from './service'

addHandler('ratings.setApiKey', (_e, key) => setApiKey(key))

addHandler('ratings.getLibraryRatings', (_e, games) => getLibraryRatings(games))

addHandler('ratings.refreshLibraryRatings', (_e, games) =>
  refreshLibraryRatings(games)
)

addHandler('ratings.getGameRatings', (_e, game) => getGameRatings(game))
