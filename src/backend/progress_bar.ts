import { InstallProgress } from './../common/types'
import { backendEvents } from './backend_events'
import { getMainWindow } from './main_window'

const handleProgressUpdate = ({ progress }: { progress: InstallProgress }) => {
  if (progress.percent) {
    getMainWindow()?.setProgressBar(progress.percent / 100)
  }
}

backendEvents.on('gameStatusUpdate', ({ appName, status }) => {
  if (status === 'done') {
    getMainWindow()?.setProgressBar(-1) // no progress bar
    backendEvents.off(`progressUpdate-${appName}`, handleProgressUpdate)
  } else {
    getMainWindow()?.setProgressBar(2) // indeterminate
    backendEvents.on(`progressUpdate-${appName}`, handleProgressUpdate)
  }
})
