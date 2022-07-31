import { ipcMain } from 'electron'
import { ProgressInfo, State } from 'heroic-wine-downloader'
import { WineVersionInfo } from 'common/types'
import {
  installWineVersion,
  removeWineVersion,
  updateWineVersionInfos
} from './utils'
import { logError, LogPrefix } from '../../logger/logger'

const abortControllers = new Map<string, AbortController>()

ipcMain.on('abortWineInstallation', (e, version: string) => {
  if (abortControllers.has(version)) {
    const abortController = abortControllers.get(version)!
    if (!abortController.signal.aborted) {
      abortController.abort()
    }
  }
})

ipcMain.handle('installWineVersion', async (e, release: WineVersionInfo) => {
  const abortController = new AbortController()
  abortControllers.set(release.version, abortController)

  const onProgress = (state: State, progress?: ProgressInfo) => {
    e.sender.send('progressOf' + release.version, { state, progress })
  }
  const result = await installWineVersion(
    release,
    onProgress,
    abortController.signal
  )
  abortControllers.delete(release.version)
  return result
})

ipcMain.handle('refreshWineVersionInfo', async (e, fetch) => {
  try {
    const releases = await updateWineVersionInfos(fetch)
    return releases
  } catch (error) {
    logError(`${error}`, LogPrefix.WineDownloader)
    throw error
  }
})

ipcMain.handle('removeWineVersion', async (e, release: WineVersionInfo) => {
  return removeWineVersion(release)
})
