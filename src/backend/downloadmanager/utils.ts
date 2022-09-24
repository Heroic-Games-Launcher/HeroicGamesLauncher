import { BrowserWindow } from 'electron'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import {
  getGame,
  isEpicServiceOffline,
  isOnline,
  notify,
  showErrorBoxModal
} from '../utils'
import { InstallParams } from 'common/types'
import i18next from 'i18next'

const storage: Storage = window.localStorage

async function installQueueElement(
  mainWindow: BrowserWindow,
  params: InstallParams
) {
  const {
    appName,
    path,
    installDlcs,
    sdlList = [],
    runner,
    installLanguage,
    platformToInstall
  } = params
  const game = getGame(appName, runner)
  const { title } = game.getGameInfo()

  if (!isOnline()) {
    logWarning(`App offline, skipping install for game '${title}'.`, {
      prefix: LogPrefix.Backend
    })
    return { status: 'error' }
  }

  const epicOffline = await isEpicServiceOffline()
  if (epicOffline && runner === 'legendary') {
    showErrorBoxModal(
      mainWindow,
      i18next.t('box.warning.title', 'Warning'),
      i18next.t(
        'box.warning.epic.install',
        'Epic Servers are having major outage right now, the game cannot be installed!'
      )
    )
    return { status: 'error' }
  }

  mainWindow.webContents.send('setGameStatus', {
    appName,
    runner,
    status: 'installing',
    folder: path
  })

  notify({
    title,
    body: i18next.t('notify.install.startInstall', 'Installation Started')
  })
  return game
    .install({
      path: path.replaceAll("'", ''),
      installDlcs,
      sdlList,
      platformToInstall,
      installLanguage
    })
    .then(async (res) => {
      notify({
        title,
        body:
          res.status === 'done'
            ? i18next.t('notify.install.finished')
            : i18next.t('notify.install.canceled')
      })
      logInfo(['finished installing of', params.appName], {
        prefix: LogPrefix.DownloadManager
      })
      mainWindow.webContents.send('setGameStatus', {
        appName,
        runner,
        status: 'done'
      })
      return res
    })
    .catch((error) => {
      if (error instanceof Error && error.name.includes('AbortError')) {
        logWarning(['Installing of', params.appName, 'aborted!'], {
          prefix: LogPrefix.DownloadManager
        })
        notify({ title, body: i18next.t('notify.install.canceled') })
      } else {
        logError(['Installing of', params.appName, 'failed with:', error], {
          prefix: LogPrefix.DownloadManager
        })
      }

      mainWindow.webContents.send('setGameStatus', {
        appName,
        runner,
        status: 'done'
      })
      return error
    })
    .finally(() => {
      storage.removeItem(appName)
    })
}

export { installQueueElement }
