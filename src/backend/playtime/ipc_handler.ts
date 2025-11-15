import { addListener, sendFrontendMessage } from '../ipc'
import { backendEvents } from '../backend_events'

import PlaytimeManager from '.'

addListener('playtime.get', (e, game_id, runner) => {
  const playtime = PlaytimeManager.get().getPlaytime(game_id, runner)
  sendFrontendMessage('playtime.update', game_id, runner, playtime)
})

backendEvents.on('playtimeUpdate', (game_id, runner, newPlaytime) => {
  sendFrontendMessage('playtime.update', game_id, runner, newPlaytime)
})
