import { addHandler } from 'backend/ipc'
import { removeRecentGame } from './recent_games'

addHandler('removeRecent', async (_event, appName) => removeRecentGame(appName))
