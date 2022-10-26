import { BrowserWindow } from 'electron'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { getGame, isEpicServiceOffline, notify } from '../utils'
import { InstallParams } from 'common/types'
import i18next from 'i18next'
import { showDialogBoxModalAuto } from '../dialog/dialog'
import { isOnline } from '../online_monitor'

async function installQueueElement(
  mainWindow: BrowserWindow,
  params: InstallParams
): Promise<{
  status: 'done' | 'error' | 'abort'
  error?: string | undefined
}> {
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

  if (runner === 'legendary') {
    const epicOffline = await isEpicServiceOffline()
    if (epicOffline) {
      showDialogBoxModalAuto({
        title: i18next.t('box.warning.title', 'Warning'),
        message: i18next.t(
          'box.warning.epic.install',
          'Epic Servers are having major outage right now, the game cannot be installed!'
        ),
        type: 'ERROR'
      })
      return { status: 'error' }
    }
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

  try {
    const { status, error } = await game.install({
      path: path.replaceAll("'", ''),
      installDlcs,
      sdlList,
      platformToInstall,
      installLanguage
    })

    if (status === 'abort') {
      logWarning(['Installing of', params.appName, 'aborted!'], {
        prefix: LogPrefix.DownloadManager
      })
      notify({ title, body: i18next.t('notify.install.canceled') })
    } else if (status === 'done') {
      notify({
        title,
        body: i18next.t('notify.install.finished')
      })

      logInfo(['Finished installing of', params.appName], {
        prefix: LogPrefix.DownloadManager
      })
    } else if (status === 'error') {
      errorMessage(error ?? '')
      return { status: 'error' }
    }

    mainWindow.webContents.send('setGameStatus', {
      appName,
      runner,
      status: 'done'
    })

    return { status }
  } catch (error) {
    errorMessage(`${error}`)
    return { status: 'error' }
  }
}

export { installQueueElement }
