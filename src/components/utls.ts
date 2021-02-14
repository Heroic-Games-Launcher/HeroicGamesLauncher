import { TFunction } from 'react-i18next/*'

import {
  getGameInfo,
  handleStopInstallation,
  install,
  importGame,
} from '../helper'
import { GameStatus } from '../types'
const { remote } = window.require('electron')
const {
  dialog: { showOpenDialog },
} = remote

interface Install {
  appName: string
  isInstalling: boolean
  installPath: 'import' | 'default' | 'another'
  handleGameStatus: (game: GameStatus) => void
  t: TFunction<'gamepage'>
}

export async function handleInstall({
  appName,
  isInstalling,
  installPath,
  handleGameStatus,
  t,
}: Install) {
  if (isInstalling) {
    const { folderName } = await getGameInfo(appName)
    return handleStopInstallation(t, appName, [installPath, folderName])
  }

  if (installPath === 'default') {
    const path = 'default'
    handleGameStatus({ appName, status: 'installing' })
    await install({ appName, path })
    // Wait to be 100% finished
    return setTimeout(() => {
      handleGameStatus({ appName, status: 'done' })
    }, 2000)
  }

  if (installPath === 'import') {
    const { filePaths } = await showOpenDialog({
      title: t('box.importpath'),
      buttonLabel: t('box.choose'),
      properties: ['openDirectory'],
    })

    if (filePaths[0]) {
      const path = filePaths[0]
      handleGameStatus({ appName, status: 'installing' })
      await importGame({ appName, path })
      return handleGameStatus({ appName, status: 'done' })
    }
  }

  if (installPath === 'another') {
    const { filePaths } = await showOpenDialog({
      title: t('box.installpath'),
      buttonLabel: t('box.choose'),
      properties: ['openDirectory'],
    })

    if (filePaths[0]) {
      const path = filePaths[0]
      handleGameStatus({ appName, status: 'installing' })
      await install({ appName, path })
      // Wait to be 100% finished
      return setTimeout(() => {
        handleGameStatus({ appName, status: 'done' })
      }, 200)
    }
  }
}
