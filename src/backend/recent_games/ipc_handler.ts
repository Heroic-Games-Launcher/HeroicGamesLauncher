import { addHandler } from 'common/ipc/backend'
import { removeRecentGame } from './recent_games'

addHandler('removeRecent', async (_event, appName) => removeRecentGame(appName))
