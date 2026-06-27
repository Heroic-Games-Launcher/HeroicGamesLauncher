import { GameStatus } from 'common/types'
import { backendEvents } from './backend_events'
import { getMainWindow } from './main_window'
import type { Game } from 'common/types/game_manager'

const handleProgressUpdate = (game: Game, { progress }: GameStatus) => {
  if (progress?.percent) {
    getMainWindow()?.setProgressBar(progress.percent / 100)
  }
}

backendEvents.on('gameStatusUpdate', (game, { status }) => {
  if (status === 'done') {
    getMainWindow()?.setProgressBar(-1) // reset progress bar
    // stop listening for progress updates
    backendEvents.off(`progressUpdate-${game.id}`, handleProgressUpdate)
  } else if (status !== 'queued') {
    // ignore 'queued' events as download may be in progress
    getMainWindow()?.setProgressBar(2) // indeterminate
    // subscribe to progress updates for current app
    backendEvents.on(`progressUpdate-${game.id}`, handleProgressUpdate)
  }
})
