import { GameStatus } from 'common/types'
import { backendEvents } from './backend_events'
import { getMainWindow } from './main_window'

const handleProgressUpdate = ({ progress }: GameStatus) => {
  if (progress?.percent) {
    getMainWindow()?.setProgressBar(progress.percent / 100)
  }
}

backendEvents.on('gameStatusUpdate', ({ appName, status }) => {
  if (status === 'done') {
    getMainWindow()?.setProgressBar(-1) // reset progress bar
    // stop listening for progress updates
    backendEvents.removeAllListeners(`progressUpdate-${appName}`)
  } else if (status !== 'queued') {
    // ignore 'queued' events as download may be in progress
    getMainWindow()?.setProgressBar(2) // indeterminate
    // remove before re-adding to prevent duplicate listeners on pause/resume cycles
    backendEvents.removeAllListeners(`progressUpdate-${appName}`)
    backendEvents.on(`progressUpdate-${appName}`, handleProgressUpdate)
  }
})
