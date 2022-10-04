import { BrowserWindow } from 'electron'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { getGame, isEpicServiceOffline, isOnline, notify } from '../utils'
import { InstallParams } from 'common/types'
import i18next from 'i18next'
import { showErrorBoxModalAuto } from '../dialog/dialog'

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
    showErrorBoxModalAuto({
      title: i18next.t('box.warning.title', 'Warning'),
      error: i18next.t(
        'box.warning.epic.install',
        'Epic Servers are having major outage right now, the game cannot be installed!'
      )
    })
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

  const errorMessage = (error: string) => {
    logError(['Installing of', params.appName, 'failed with:', error], {
      prefix: LogPrefix.DownloadManager
    })

    mainWindow.webContents.send('setGameStatus', {
      appName,
      runner,
      status: 'done'
    })
    return error
  }

  return game
    .install({
      path: path.replaceAll("'", ''),
      installDlcs,
      sdlList,
      platformToInstall,
      installLanguage
    })
    .then(async (res) => {
      if (res.status === 'abort') {
        logWarning(['Installing of', params.appName, 'aborted!'], {
          prefix: LogPrefix.DownloadManager
        })
        notify({ title, body: i18next.t('notify.install.canceled') })
      } else if (res.status === 'done') {
        notify({
          title,
          body: i18next.t('notify.install.finished')
        })

        logInfo(['Finished installing of', params.appName], {
          prefix: LogPrefix.DownloadManager
        })
      } else if (res.status === 'error') {
        return errorMessage(res.error ?? '')
      }

      mainWindow.webContents.send('setGameStatus', {
        appName,
        runner,
        status: 'done'
      })
      return res
    })
    .catch((error) => {
      return errorMessage(`${error}`)
    })
}

export { installQueueElement }
