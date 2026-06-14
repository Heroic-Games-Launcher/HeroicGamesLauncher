import { logError, LogPrefix, logWarning } from 'backend/logger'
import {
  downloadFile,
  getGame,
  isEpicServiceOffline,
  sendGameStatusUpdate
} from '../utils'
import { DMStatus, InstallParams } from 'common/types'
import i18next from 'i18next'
import { notify, showDialogBoxModalAuto } from '../dialog/dialog'
import { isOnline } from '../online_monitor'
import pathModule from 'path'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { storeMap } from 'common/utils'
import { gogdlConfigPath } from 'backend/storeManagers/gog/constants'
import { fixesPath } from 'backend/constants/paths'
import type { Game } from 'common/types/game_manager'

async function installQueueElement(params: InstallParams): Promise<{
  status: DMStatus
  error?: string | undefined
}> {
  const {
    appName,
    path,
    installDlcs,
    sdlList = [],
    runner,
    installLanguage,
    platformToInstall,
    build,
    branch
  } = params
  const game = getGame(appName, runner)
  const { title } = game.getGameInfo()

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

  if (runner === 'gog') {
    // Sometimes, a game manifest file already exists and that makes the installation
    // end as soon as it's started. We have to delete the file to prevent that issue.
    const manifestPath = pathModule.join(gogdlConfigPath, 'manifests', appName)
    if (existsSync(manifestPath)) rmSync(manifestPath)
  }

  sendGameStatusUpdate(game, {
    status: 'installing',
    folder: path
  })

  notify({
    title,
    body: i18next.t('notify.install.startInstall', 'Installation Started')
  })

  const errorMessage = (error: string) => {
    logError(
      ['Installation of', params.appName, 'failed with:', error],
      LogPrefix.DownloadManager
    )
  }

  try {
    downloadFixesFor(getGame(appName, runner))

    const { status, error } = await getGame(appName, runner).install({
      path: path.replaceAll("'", ''),
      installDlcs,
      sdlList: sdlList.filter((el) => el !== ''),
      platformToInstall,
      installLanguage,
      build,
      branch
    })

    if (status === 'error') {
      errorMessage(error ?? '')
    }

    return { status }
  } catch (error) {
    errorMessage(`${error}`)
    return { status: 'error' }
  } finally {
    sendGameStatusUpdate(game, 'done')
  }
}

async function updateQueueElement(params: InstallParams): Promise<{
  status: DMStatus
  error?: string | undefined
}> {
  const { appName, runner } = params
  const game = getGame(appName, runner)
  const { title } = game.getGameInfo()

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

  sendGameStatusUpdate(game, 'updating')

  notify({
    title,
    body: i18next.t('notify.update.started', 'Update Started')
  })

  const errorMessage = (error: string) => {
    logError(
      ['Update of', params.appName, 'failed with:', error],
      LogPrefix.DownloadManager
    )
  }

  try {
    const { status } = await getGame(appName, runner).update({
      build: params.build,
      branch: params.branch,
      language: params.installLanguage,
      dlcs: params.installDlcs,
      dependencies: params.dependencies
    })

    if (status === 'error') {
      errorMessage('')
    }

    return { status }
  } catch (error) {
    errorMessage(`${error}`)
    return { status: 'error' }
  } finally {
    sendGameStatusUpdate(game, 'done')
  }
}

async function downloadFixesFor(game: Game) {
  const url = `https://raw.githubusercontent.com/Heroic-Games-Launcher/known-fixes/main/${storeMap[game.runner]}/${game.id}-${storeMap[game.runner]}.json`
  const dest = pathModule.join(
    fixesPath,
    `${game.id}-${storeMap[game.runner]}.json`
  )
  if (!existsSync(fixesPath)) {
    mkdirSync(fixesPath, { recursive: true })
  }
  downloadFile({ url, dest, ignoreFailure: true })
}

export { installQueueElement, updateQueueElement }
