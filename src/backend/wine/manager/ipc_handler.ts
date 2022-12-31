import { ipcMain } from 'electron'
import { ProgressInfo, State } from 'heroic-wine-downloader'
import {
  installWineVersion,
  removeWineVersion,
  updateWineVersionInfos
} from './utils'
import { logError, LogPrefix } from '../../logger/logger'
import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { sendFrontendMessage } from '../../main_window'

ipcMain.handle('installWineVersion', async (e, release) => {
  const onProgress = (state: State, progress?: ProgressInfo) => {
    sendFrontendMessage('progressOfWineManager' + release.version, {
      state,
      progress
    })
  }
  const result = await installWineVersion(
    release,
    onProgress,
    createAbortController(release.version).signal
  )
  deleteAbortController(release.version)
  return result
})

ipcMain.handle('refreshWineVersionInfo', async (e, fetch?) => {
  try {
    await updateWineVersionInfos(fetch)
    return
  } catch (error) {
    logError(error, LogPrefix.WineDownloader)
    return
  }
})

ipcMain.handle('removeWineVersion', async (e, release) =>
  removeWineVersion(release)
)
