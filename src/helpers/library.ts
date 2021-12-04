import { AppSettings, GameInfo, GameStatus, InstallProgress } from 'src/types'
import { IpcRenderer } from 'electron'
import { TFunction } from 'react-i18next'
import { getGameInfo, sendKill } from './index'
import ElectronStore from 'electron-store'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

const storage: Storage = window.localStorage

type InstallArgs = {
  appName: string
  handleGameStatus: (game: GameStatus) =>  Promise<void>
  installPath: string
  isInstalling: boolean
  previousProgress: InstallProgress | null
  progress: InstallProgress
  setInstallPath?: (path: string) => void
  t: TFunction<'gamepage'>,
  installDlcs?: boolean,
  sdlList?: Array<string>
}

async function install({appName, installPath, t, progress, isInstalling, handleGameStatus, previousProgress, setInstallPath, sdlList = [], installDlcs = false}: InstallArgs) {
  if(!installPath)
  {
    return;
  }

  const {folder_name, is_game, is_installed}: GameInfo = await getGameInfo(appName)
  if (isInstalling) {
    if (installPath === 'default') {
      const { defaultInstallPath }: AppSettings = await ipcRenderer.invoke('requestSettings', 'default')
      installPath = defaultInstallPath
    }
    return handleStopInstallation(appName, [installPath, folder_name], t, progress)
  }

  if (is_installed) {
    return uninstall({appName, handleGameStatus, t})
  }

  if (installPath === 'import' && is_game) {
    const args = {
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'],
      title: t('gamepage:box.importpath')
    }
    const { path, canceled } = await ipcRenderer.invoke('openDialog', args)

    if (canceled || !path) {
      return
    }

    handleGameStatus({ appName, status: 'installing' })
    await importGame({ appName, path })
    return await handleGameStatus({ appName, status: 'done' })
  }

  if (installPath === 'another' || !is_game) {
    const args = {
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'],
      title: t('gamepage:box.installpath')
    }
    const { path, canceled } = await ipcRenderer.invoke('openDialog', args)

    if (canceled || !path) {
      return
    }

    setInstallPath && setInstallPath(path)
    // If the user changed the previous folder, the percentage should start from zero again.
    if (previousProgress && previousProgress.folder !== path) {
      storage.removeItem(appName)
    }
    handleGameStatus({ appName, status: 'installing' })
    const result = await ipcRenderer.invoke('install', { appName, path: `'${path}'`, installDlcs, sdlList })

    if (result && result.status === 'error'){
      return await handleGameStatus({ appName, status: 'error' })
    }

    if (progress.percent === '100%') {
      storage.removeItem(appName)
    }
    return await handleGameStatus({ appName, status: 'done' })
  }

  if (is_game) {
    // If the user changed the previous folder, the percentage should start from zero again.
    let path = installPath
    if (installPath === 'default') {
      const {defaultInstallPath}: AppSettings = await ipcRenderer.invoke('requestSettings', 'default')
      path = defaultInstallPath
    }
    if (previousProgress && previousProgress.folder !== path) {
      storage.removeItem(appName)
    }

    await handleGameStatus({ appName, status: 'installing' })

    const result = await ipcRenderer.invoke('install', { appName, path: `'${path}'`, installDlcs, sdlList })

    if (result && result.status === 'error'){
      return await handleGameStatus({ appName, status: 'error' })
    }

    if (progress.percent === '100%') {
      storage.removeItem(appName)
    }

    return await handleGameStatus({ appName, status: 'done' })
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
  const args = {
    buttons: [t('box.yes'), t('box.no')],
    message: t('gamepage:box.uninstall.message'),
    title: t('gamepage:box.uninstall.title'),
    type: 'warning'
  }

  const { response } = await ipcRenderer.invoke('openMessageBox', args)

  if (response === 0) {
    await handleGameStatus({ appName, status: 'uninstalling' })
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

  const args = {
    buttons: [
      t('gamepage:box.stopInstall.keepInstalling'),
      t('box.yes'),
      t('box.no')
    ],
    message: t('gamepage:box.stopInstall.message'),
    title: t('gamepage:box.stopInstall.title')
  }

  const { response } = await ipcRenderer.invoke('openMessageBox', args)

  if (response === 1) {
    storage.setItem(appName, JSON.stringify({...progress, folder: path}))
    return sendKill(appName)
  } else if (response === 2) {
    await sendKill(appName)
    storage.removeItem(appName)
    return ipcRenderer.send('removeFolder', [path, folderName])
  }
}

const repair = async (appName: string): Promise<void> =>
  await ipcRenderer.invoke('repair', appName)

type LaunchOptions = {
  appName: string, t: TFunction<'gamepage'>, handleGameStatus: (game: GameStatus) => Promise<void>, launchArguments?: string
}

const launch = ({appName, handleGameStatus,t, launchArguments}: LaunchOptions): Promise<void> =>
  ipcRenderer.invoke('launch', {appName, launchArguments})
    .then(async (err: string | string[]) => {
      if (!err) {
        return
      }

      if (
        typeof err === 'string' &&
      err.includes('ERROR: Game is out of date')
      ) {
        const args = {
          buttons: [t('gamepage:box.yes'), t('box.no')],
          message: t('gamepage:box.update.message'),
          title: t('gamepage:box.update.title')
        }

        const { response } = await ipcRenderer.invoke('openMessageBox', args)

        if (response === 0) {
          await handleGameStatus({ appName, status: 'done' })
          await handleGameStatus({ appName, status: 'updating' })
          await updateGame(appName)
          return await handleGameStatus({ appName, status: 'done' })
        }
        await handleGameStatus({ appName, status: 'playing' })
        await ipcRenderer.invoke('launch', {appName: `${appName} --skip-version-check`, launchArguments})
        return await handleGameStatus({ appName, status: 'done' })
      }
    })

const updateGame = (appName: string): Promise<void> =>
  ipcRenderer.invoke('updateGame', appName)

// Todo: Get Back to update all games
function updateAllGames(
  gameList: Array<string>,
  handleGameStatus: (game: GameStatus) => Promise<void>) {
  gameList.forEach(async (appName) => {
    await handleGameStatus({appName, status: 'updating'})
    await updateGame(appName)
  })
}

type RecentGame = {
  appName: string
  title: string
}

function getRecentGames(library: GameInfo[]) {
  return library.filter((game) => {
    const Store = window.require('electron-store')
    const configStore: ElectronStore = new Store({
      cwd: 'store'
    })
    const recentGames: Array<RecentGame> = configStore.get('games.recent') as Array<RecentGame> || []
    const recentGamesList = recentGames.map(a => a.appName) as string[]
    return recentGamesList.includes(game.app_name)
  })
}

export {
  handleStopInstallation,
  getRecentGames,
  install,
  launch,
  repair,
  uninstall,
  updateAllGames,
  updateGame
}
