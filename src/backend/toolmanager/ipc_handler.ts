import { ipcMain, BrowserWindow } from 'electron'
import { ToolVersionInfo, ProgressInfo, State } from 'common/types/toolmanager'
import {
  installToolVersion,
  removeToolVersion,
  updateToolVersionInfos
} from './utils'
import {
  createAbortController,
  deleteAbortController
} from '../utils/aborthandler/aborthandler'
import { logError, LogPrefix } from 'backend/logger/logger'

ipcMain.handle('installToolVersion', async (e, release: ToolVersionInfo) => {
  const window = BrowserWindow.getAllWindows()[0]
  const onProgress = (state: State, progress?: ProgressInfo) => {
    window.webContents.send('progressOfToolManager' + release.version, {
      state,
      progress
    })
  }
  const result = await installToolVersion(
    release,
    onProgress,
    createAbortController(release.version).signal
  )
  deleteAbortController(release.version)
  return result
})

ipcMain.handle('refreshToolVersionInfo', async (e, fetch) => {
  try {
    const releases = await updateToolVersionInfos(fetch)
    return releases
  } catch (error) {
    logError(error, { prefix: LogPrefix.ToolManager })
    throw error
  }
})

ipcMain.handle('removeToolVersion', async (e, release: ToolVersionInfo) => {
  return removeToolVersion(release)
})
