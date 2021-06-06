import { AppSettings, GameInfo, GameStatus, InstallProgress } from 'src/types'
import { IpcRenderer, Remote } from 'electron'
import { TFunction } from 'react-i18next'
import { getGameInfo, sendKill } from './index'

const { ipcRenderer, remote } = window.require('electron') as {
  ipcRenderer: IpcRenderer
  remote: Remote
}
const {
  dialog: { showMessageBox, showOpenDialog }
} = remote

const storage: Storage = window.localStorage

type InstallArgs = {
  appName: string
  handleGameStatus: (game: GameStatus) =>  Promise<void>
  installPath: string
  isInstalling: boolean
  previousProgress: InstallProgress
  progress: InstallProgress
  setInstallPath?: (path: string) => void
  t: TFunction<'gamepage'>
}

async function install({appName, installPath, t, progress, isInstalling, handleGameStatus, previousProgress, setInstallPath}: InstallArgs) {
  const {folder_name, is_game, is_installed}: GameInfo = await getGameInfo(appName)
  //Fix  Remove files when canceling (again)
  if (isInstalling) {
    return handleStopInstallation(appName, [installPath, folder_name], t, progress)
  }

  if (is_installed) {
    return uninstall({appName, handleGameStatus, t})
  }

  if (installPath === 'defaut' && is_game) {
    // If the user changed the previous folder, the percentage should start from zero again.
    const {
      defaultInstallPath: installPath
    }: AppSettings = await ipcRenderer.invoke('requestSettings', 'default')

    if (previousProgress.folder !== installPath) {
      storage.removeItem(appName)
    }
    await handleGameStatus({ appName, status: 'installing' })
    await ipcRenderer.invoke('install', { appName, path: installPath })

    if (progress.percent === '100%') {
      storage.removeItem(appName)
    }

    return await handleGameStatus({ appName, status: 'done' })
  }

  if (installPath === 'import' && is_game) {
    const { filePaths, canceled } = await showOpenDialog({
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'],
      title: t('gamepage:box.importpath')
    })

    if (canceled) {
      return
    }

    if (filePaths[0]) {
      const path = `'${filePaths[0]}'`
      handleGameStatus({ appName, status: 'installing' })
      await importGame({ appName, path })
      return await handleGameStatus({ appName, status: 'done' })
    }
  }

  if (installPath === 'another' || !is_game) {
    const { filePaths, canceled } = await showOpenDialog({
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'],
      title: t('gamepage:box.installpath')
    })

    if (canceled) {
      return
    }

    if (filePaths[0]) {
      const path = `'${filePaths[0]}'`
      setInstallPath && setInstallPath(path)
      // If the user changed the previous folder, the percentage should start from zero again.
      if (previousProgress.folder !== path) {
        storage.removeItem(appName)
      }
      handleGameStatus({ appName, status: 'installing' })
      await ipcRenderer.invoke('install', { appName, path })

      if (progress.percent === '100%') {
        storage.removeItem(appName)
      }
      return await handleGameStatus({ appName, status: 'done' })
    }
  }
}

const importGame = async (args: {
  appName: string
  path: string
}): Promise<void> => await ipcRenderer.invoke('importGame', args)

type UninstallArgs = {
  appName: string
  handleGameStatus: (game: GameStatus) =>  Promise<void>
  t: TFunction<'gamepage'>
}

async function uninstall({appName, handleGameStatus, t}: UninstallArgs) {
  const { response } = await showMessageBox({
    buttons: [t('box.yes'), t('box.no')],
    message: t('gamepage:box.uninstall.message'),
    title: t('gamepage:box.uninstall.title'),
    type: 'warning'
  })

  if (response === 0) {
    handleGameStatus({ appName, status: 'uninstalling' })
    await ipcRenderer.invoke('uninstall', appName)
    storage.removeItem(appName)
    return await handleGameStatus({ appName, status: 'done' })
  }
  return
}

async function handleStopInstallation(
  appName: string,
  [path, folderName]: string[],
  t: TFunction<'gamepage'>,
  progress: InstallProgress
) {
  const { response } = await showMessageBox({
    buttons: [
      t('gamepage:box.stopInstall.keepInstalling'),
      t('box.yes'),
      t('box.no')
    ],
    message: t('gamepage:box.stopInstall.message'),
    title: t('gamepage:box.stopInstall.title')
  })
  if (response === 1) {
    storage.setItem(appName, JSON.stringify({...progress, folder: path}))
    return sendKill(appName)
  } else if (response === 2) {
    sendKill(appName)
    storage.removeItem(appName)
    return ipcRenderer.send('removeFolder', [path, folderName])
  }
}

const repair = async (appName: string): Promise<void> =>
  await ipcRenderer.invoke('repair', appName)

const launch = (appName: string, t: TFunction<'gamepage'>, handleGameStatus: (game: GameStatus) => Promise<void>): Promise<void> =>
  ipcRenderer.invoke('launch', appName)
    .then(async (err: string | string[]) => {
      if (!err) {
        return
      }

      if (
        typeof err === 'string' &&
      err.includes('ERROR: Game is out of date')
      ) {
        const { response } = await showMessageBox({
          buttons: [t('gamepage:box.yes'), t('box.no')],
          message: t('gamepage:box.update.message'),
          title: t('gamepage:box.update.title')
        })

        if (response === 0) {
          await handleGameStatus({ appName, status: 'done' })
          await handleGameStatus({ appName, status: 'updating' })
          await updateGame(appName)
          return await handleGameStatus({ appName, status: 'done' })
        }
        await handleGameStatus({ appName, status: 'playing' })
        await ipcRenderer.invoke('launch', `${appName} --skip-version-check`)
        return await handleGameStatus({ appName, status: 'done' })
      }
    })

const updateGame = (appName: string): Promise<void> =>
  ipcRenderer.invoke('updateGame', appName)

export {
  handleStopInstallation,
  install,
  launch,
  repair,
  uninstall,
  updateGame
}
