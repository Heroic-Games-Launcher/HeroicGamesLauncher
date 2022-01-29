import { ipcMain } from 'electron'
import { ProgressInfo, State } from 'heroic-wine-downloader'
import i18next from 'i18next'
import { WineVersionInfo } from './types'
import {
  installWineVersion,
  removeWineVersion,
  updateWineVersionInfos
} from './utils'
import { notify } from '../main'
import { logError, LogPrefix } from '../logger/logger'

let abortController: AbortController

ipcMain.on('abortWineInstallation', () => {
  if (!abortController.signal.aborted) {
    abortController.abort()
  }
})

ipcMain.handle('installWineVersion', async (e, release: WineVersionInfo) => {
  abortController = new AbortController()

  const onProgress = (state: State, progress: ProgressInfo) => {
    e.sender.send('progressOf' + release.version, { state, progress })
  }
  notify({
    title: `${release?.version}`,
    body: i18next.t('notify.install.startInstall')
  })
  return installWineVersion(release, onProgress, abortController.signal).then(
    (res) => {
      switch (res) {
        case 'error':
          notify({
            title: `${release?.version}`,
            body: i18next.t('notify.install.error')
          })
          break
        case 'abort':
          notify({
            title: `${release?.version}`,
            body: i18next.t('notify.install.canceled')
          })
          break
        case 'success':
          notify({
            title: `${release?.version}`,
            body: i18next.t('notify.install.finished')
          })
          break
        default:
          break
      }
      return res
    }
  )
})

ipcMain.handle('refreshWineVersionInfo', async (e, fetch) => {
  try {
    const releases = await updateWineVersionInfos(fetch)
    return releases
  } catch (error) {
    logError(String(error), LogPrefix.WineDownloader)
    return
  }
})

ipcMain.handle('removeWineVersion', async (e, release: WineVersionInfo) => {
  return removeWineVersion(release).then((res) => {
    notify({
      title: `${release?.version}`,
      body: i18next.t('notify.uninstalled')
    })
    return res
  })
})
