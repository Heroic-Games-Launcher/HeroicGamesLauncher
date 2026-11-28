import type { TFunction } from 'i18next'
import type { ButtonOptions, InstallProgress } from 'common/types'
import type { DialogModalOptions } from 'frontend/types'

type StopInstallationCancelApi = {
  cancelDownload: (removeDownloaded: boolean) => unknown
  cancelQueuedDownload: (appName: string, removeDownloaded: boolean) => unknown
}

export function getStopInstallationCancel(
  appName: string,
  api: StopInstallationCancelApi,
  queued: boolean
) {
  return (removeDownloaded: boolean) =>
    queued
      ? api.cancelQueuedDownload(appName, removeDownloaded)
      : api.cancelDownload(removeDownloaded)
}

type StopInstallationStorage = {
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

type StopInstallationActions = {
  cancel: (removeDownloaded: boolean) => void
  keepProgress: () => void
  removeProgress: () => void
}

export function getStopInstallationDialog(
  t: TFunction<'gamepage'>,
  progress: InstallProgress,
  actions: StopInstallationActions,
  queued = false
): DialogModalOptions {
  const title = t('gamepage:box.stopInstall.title', 'Stop installing?')
  const keepInstalling: ButtonOptions = {
    text: t('gamepage:box.stopInstall.keepInstalling', 'Keep installing'),
    variant: 'secondary'
  }
  const hasProgress = Boolean(progress.percent) || progress.bytes !== undefined

  if (queued && !hasProgress) {
    return {
      title: t('gamepage:box.stopInstall.titleQueued', 'Remove from queue'),
      message: t(
        'gamepage:box.stopInstall.messageQueued',
        "Nothing has been downloaded yet, so removing it from the queue won't delete anything."
      ),
      buttonLayout: 'inline',
      buttons: [
        keepInstalling,
        {
          text: t(
            'gamepage:box.stopInstall.removeFromQueue',
            'Remove from queue'
          ),
          variant: 'danger',
          onClick: () => actions.cancel(false)
        }
      ]
    }
  }

  return {
    title,
    message: t(
      'gamepage:box.stopInstall.message',
      'Keep the files downloaded so far to resume later, or delete them to free up disk space.'
    ),
    buttonLayout: 'inline',
    buttons: [
      keepInstalling,
      {
        text: t(
          'gamepage:box.stopInstall.stopKeepFiles',
          'Stop and keep files'
        ),
        variant: 'primary',
        onClick: () => {
          actions.keepProgress()
          actions.cancel(false)
        }
      },
      {
        text: t(
          'gamepage:box.stopInstall.stopDeleteFiles',
          'Stop and delete files'
        ),
        variant: 'danger',
        onClick: () => {
          actions.removeProgress()
          actions.cancel(true)
        }
      }
    ]
  }
}

export function openStopInstallationDialog(params: {
  appName: string
  path: string
  t: TFunction<'gamepage'>
  progress: InstallProgress
  showDialogModal: (options: DialogModalOptions) => void
  api: StopInstallationCancelApi
  storage: StopInstallationStorage
  queued?: boolean
}): void {
  const {
    appName,
    path,
    t,
    progress,
    showDialogModal,
    api,
    storage,
    queued = false
  } = params

  showDialogModal(
    getStopInstallationDialog(
      t,
      progress,
      {
        cancel: getStopInstallationCancel(appName, api, queued),
        keepProgress: () =>
          storage.setItem(
            appName,
            JSON.stringify({ ...progress, folder: path })
          ),
        removeProgress: () => storage.removeItem(appName)
      },
      queued
    )
  )
}
