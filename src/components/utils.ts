import {
  getGameInfo,
  handleStopInstallation,
  importGame,
  install
} from 'src/helpers'

import { AppSettings, GameStatus, InstallProgress } from 'src/types'
import { TFunction } from 'react-i18next'

const { ipcRenderer, remote } = window.require('electron')
const {
  dialog: { showOpenDialog }
} = remote

interface Install {
  appName: string
  handleGameStatus: (game: GameStatus) => Promise<void>
  installPath: 'import' | 'default' | 'another'
  isInstalling: boolean
  progress: InstallProgress
  t: TFunction<'gamepage'>
}

export async function handleInstall({
  appName,
  isInstalling,
  installPath,
  handleGameStatus,
  t,
  progress
}: Install) {
  const config: AppSettings = await ipcRenderer.invoke(
    'requestSettings',
    'default'
  )

  if (isInstalling) {
    const { folder_name } = await getGameInfo(appName)
    let path: string = installPath
    if (installPath === 'default'){
      path = config.defaultInstallPath
    }
    return handleStopInstallation(appName, [path, folder_name], t, progress)
  }

  if (installPath === 'default') {
    const path = config.defaultInstallPath
    await handleGameStatus({ appName, status: 'installing' })
    await install({ appName, path })
    return await handleGameStatus({ appName, status: 'done' })
  }

  if (installPath === 'import') {
    const { filePaths } = await showOpenDialog({
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'],
      title: t('gamepage:box.importpath')
    })

    if (filePaths[0]) {
      const path = filePaths[0]
      await handleGameStatus({ appName, status: 'installing' })
      await importGame({ appName, path })
      return await handleGameStatus({ appName, status: 'done' })
    }
  }

  if (installPath === 'another') {
    const { filePaths } = await showOpenDialog({
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'],
      title: t('gamepage:box.installpath')
    })

    if (filePaths[0]) {
      const path = `'${filePaths[0]}'`
      await handleGameStatus({ appName, status: 'installing' })
      await install({ appName, path })
      return await handleGameStatus({ appName, status: 'done' })
    }
  }
}
