import { gameManagerMap } from 'backend/storeManagers'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { isEpicServiceOffline } from '../utils'
import { InstallParams, InstallPlatform } from 'common/types'
import i18next from 'i18next'
import { notify, showDialogBoxModalAuto } from '../dialog/dialog'
import { isOnline } from '../online_monitor'
import { sendFrontendMessage } from '../main_window'
import { installHyperPlayGame } from 'backend/hyperplay/library'
import { trackEvent } from 'backend/api/metrics'

async function installQueueElement(params: InstallParams): Promise<{
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
  const { title } = gameManagerMap[runner].getGameInfo(appName)

  if (!isOnline()) {
    logWarning(
      `App offline, skipping install for game '${title}'.`,
      LogPrefix.Backend
    )
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

  sendFrontendMessage('gameStatusUpdate', {
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
    logError(
      ['Installing of', params.appName, 'failed with:', error],
      LogPrefix.DownloadManager
    )

    sendFrontendMessage('gameStatusUpdate', {
      appName,
      runner,
      status: 'done'
    })
    return error
  }

  try {
    const installPlatform = platformToInstall as InstallPlatform
    const installInstance = async () =>
      gameManagerMap[runner].install(appName, {
        path: path.replaceAll("'", ''),
        installDlcs,
        sdlList,
        platformToInstall: installPlatform,
        installLanguage
      })

    const { status, error } = await installInstance()

    if (status === 'abort') {
      logWarning(
        ['Installing of', params.appName, 'aborted!'],
        LogPrefix.DownloadManager
      )
      notify({ title, body: i18next.t('notify.install.canceled') })
    } else if (status === 'done') {
      notify({
        title,
        body: i18next.t('notify.install.finished')
      })

      logInfo(
        ['Finished installing of', params.appName],
        LogPrefix.DownloadManager
      )
    } else if (status === 'error') {
      errorMessage(error ?? '')
      return { status: 'error' }
    }

    sendFrontendMessage('gameStatusUpdate', {
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

async function updateQueueElement(params: InstallParams): Promise<{
  status: 'done' | 'error'
  error?: string | undefined
}> {
  const { appName, runner } = params
  const { title } = gameManagerMap[runner].getGameInfo(appName)

  if (!isOnline()) {
    logWarning(
      `App offline, skipping update for game '${title}'.`,
      LogPrefix.Backend
    )
    return { status: 'error' }
  }

  if (runner === 'legendary') {
    const epicOffline = await isEpicServiceOffline()
    if (epicOffline) {
      showDialogBoxModalAuto({
        title: i18next.t('box.warning.title', 'Warning'),
        message: i18next.t(
          'box.warning.epic.update',
          'Epic Servers are having major outage right now, the game cannot be updated!'
        ),
        type: 'ERROR'
      })
      return { status: 'error' }
    }
  }

  sendFrontendMessage('gameStatusUpdate', {
    appName,
    runner,
    status: 'updating'
  })

  notify({
    title,
    body: i18next.t('notify.update.started', 'Update Started')
  })

  try {
    const { status } = await gameManagerMap[runner].update(appName)

    if (status === 'error') {
      logWarning(
        ['Updating of', params.appName, 'aborted!'],
        LogPrefix.DownloadManager
      )
      notify({ title, body: i18next.t('notify.update.canceled') })
    } else if (status === 'done') {
      notify({
        title,
        body: i18next.t('notify.update.finished')
      })

      logInfo(
        ['Finished updating of', params.appName],
        LogPrefix.DownloadManager
      )
    }
    return { status: 'done' }
  } catch (error) {
    logError(
      ['Updating of', params.appName, 'failed with:', error],
      LogPrefix.DownloadManager
    )

    sendFrontendMessage('gameStatusUpdate', {
      appName,
      runner,
      status: 'done'
    })

    return { status: 'error' }
  }
}

export { installQueueElement, updateQueueElement }
