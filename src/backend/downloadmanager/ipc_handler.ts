import { addHandler, addListener } from '../ipc'
import {
  addToQueue,
  cancelCurrentDownload,
  getQueueInformation,
  pauseCurrentDownload,
  removeFromQueue,
  resumeCurrentDownload
} from './downloadqueue'
import { t } from 'i18next'
import {
  moveOnWindows,
  moveOnUnix,
  removeFolder,
  sendGameStatusUpdate
} from 'backend/utils'
import { isWindows } from 'backend/constants/environment'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import { join } from 'path'

import type { DMQueueElement } from 'common/types'

addHandler('install', async (_e, args) => {
  if (args.previousProgress?.folder && args.gameInfo.folder_name) {
    if (
      args.previousProgressStrategy === 'move' &&
      args.previousProgress.folder !== args.path
    ) {
      sendGameStatusUpdate({
        appName: args.gameInfo.app_name,
        status: 'moving'
      })

      const moveImpl = isWindows ? moveOnWindows : moveOnUnix
      const result = await moveImpl(args.path, {
        ...args.gameInfo,
        install: {
          install_path: join(
            args.previousProgress.folder,
            args.gameInfo.folder_name
          )
        }
      })

      if (result.status === 'error') {
        showDialogBoxModalAuto({
          title: t(
            'box.error.previous_progress_move_failure.title',
            'Failed to move previously downloaded files'
          ),
          message: t(
            'box.error.previous_progress_move_failure.message',
            `Error: {{error}}\nContinuing without moving previous progress.`,
            { error: result.error }
          ),
          type: 'ERROR'
        })
      }
    } else if (args.previousProgressStrategy === 'delete') {
      removeFolder(args.previousProgress.folder, args.gameInfo.folder_name)
    }
  }

  const dmQueueElement: DMQueueElement = {
    params: args,
    type: 'install',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  await addToQueue(dmQueueElement)

  // Add Dlcs to the queue
  if (
    Array.isArray(args.installDlcs) &&
    args.installDlcs.length > 0 &&
    args.runner === 'legendary'
  ) {
    for (const dlc of args.installDlcs) {
      const dlcQueueElement: DMQueueElement = {
        params: {
          ...args,
          appName: dlc
        },
        type: 'install',
        addToQueueTime: Date.now(),
        endTime: 0,
        startTime: 0
      }
      await addToQueue(dlcQueueElement)
    }
  }
})

addHandler('updateGame', async (_e, args) => {
  const {
    gameInfo: {
      install: { platform, install_path }
    }
  } = args

  const dmQueueElement: DMQueueElement = {
    params: { ...args, path: install_path!, platformToInstall: platform! },
    type: 'update',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  await addToQueue(dmQueueElement)
})

addListener('removeFromDMQueue', (e, appName) => removeFromQueue(appName))
addListener('resumeCurrentDownload', () => resumeCurrentDownload())
addListener('pauseCurrentDownload', () => pauseCurrentDownload())
addListener('cancelDownload', (e, removeDownloaded) =>
  cancelCurrentDownload({ removeDownloaded })
)
addHandler('getDMQueueInformation', getQueueInformation)
