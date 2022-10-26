import { ipcMain, BrowserWindow } from 'electron'
import { ProgressInfo, State } from 'heroic-wine-downloader'
import { WineVersionInfo } from 'common/types'
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

ipcMain.handle(
  'installWineVersion',
  async (
    e,
    release: WineVersionInfo
  ): Promise<'error' | 'abort' | 'success'> => {
    const window = BrowserWindow.getAllWindows()[0]
    const onProgress = (state: State, progress?: ProgressInfo) => {
      window.webContents.send('progressOfWineManager' + release.version, {
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
  }
)

ipcMain.handle(
  'refreshWineVersionInfo',
  async (e, fetch?: boolean): Promise<WineVersionInfo[]> => {
    try {
      const releases = await updateWineVersionInfos(fetch)
      return releases
    } catch (error) {
      logError(error, { prefix: LogPrefix.WineDownloader })
      return []
    }
  }
)

ipcMain.handle(
  'removeWineVersion',
  async (e, release: WineVersionInfo): Promise<boolean> =>
    removeWineVersion(release)
)
