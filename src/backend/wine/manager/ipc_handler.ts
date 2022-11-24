import { ipcMain } from 'electron'
import { removeWineVersion, updateWineVersionInfos } from './utils'
import { logError, LogPrefix } from '../../logger/logger'

ipcMain.handle('refreshWineVersionInfo', async (e, fetch?) => {
  try {
    const releases = await updateWineVersionInfos(fetch)
    return releases
  } catch (error) {
    logError(error, { prefix: LogPrefix.WineDownloader })
    return []
  }
})

ipcMain.handle('removeWineVersion', async (e, release) =>
  removeWineVersion(release)
)
