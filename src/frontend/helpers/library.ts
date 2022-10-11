import {
  InstallPlatform,
  AppSettings,
  GameInfo,
  GameStatus,
  InstallProgress,
  Runner
} from 'common/types'

import { TFunction } from 'react-i18next'
import { getGameInfo, sendKill } from './index'
import { configStore } from './electronStores'
import { DialogModalOptions } from 'frontend/types'

const storage: Storage = window.localStorage

type InstallArgs = {
  appName: string
  handleGameStatus: (game: GameStatus) => Promise<void>
  installPath: string
  isInstalling: boolean
  previousProgress: InstallProgress | null
  progress: InstallProgress
  setInstallPath?: (path: string) => void
  platformToInstall?: InstallPlatform
  t: TFunction<'gamepage'>
  installDlcs?: boolean
  sdlList?: Array<string>
  installLanguage?: string
  runner?: Runner
  showDialogModal: (options: DialogModalOptions) => void
}

async function install({
  appName,
  installPath,
  t,
  progress,
  isInstalling,
  handleGameStatus,
  previousProgress,
  setInstallPath,
  sdlList = [],
  installDlcs = false,
  installLanguage = 'en-US',
  runner = 'legendary',
  platformToInstall = 'Windows',
  showDialogModal
}: InstallArgs) {
  if (!installPath) {
    return
  }

  const { folder_name, is_installed }: GameInfo = await getGameInfo(
    appName,
    runner
  )
  if (isInstalling) {
    return handleStopInstallation(
      appName,
      [installPath, folder_name],
      t,
      progress,
      runner,
      showDialogModal
    )
  }

  if (is_installed) {
    return
  }

  if (installPath === 'import') {
    const { defaultInstallPath }: AppSettings =
      await window.api.requestSettings('default')
    const args = {
      buttonLabel: t('gamepage:box.choose'),
      properties: ['openDirectory'] as Array<
        | 'openFile'
        | 'openDirectory'
        | 'multiSelections'
        | 'showHiddenFiles'
        | 'createDirectory'
        | 'promptToCreate'
        | 'noResolveAliases'
        | 'treatPackageAsDirectory'
        | 'dontAddToRecent'
      >,
      title: t('gamepage:box.importpath'),
      defaultPath: defaultInstallPath
    }
    const { path, canceled } = await window.api.openDialog(args)

    if (canceled || !path) {
      return
    }

    return importGame({ appName, path, runner })
  }

  if (installPath !== 'default') {
    setInstallPath && setInstallPath(installPath)
    // If the user changed the previous folder, the percentage should start from zero again.
    if (previousProgress && previousProgress.folder !== installPath) {
      storage.removeItem(appName)
    }
    handleGameStatus({
      folder: installPath,
      appName,
      runner,
      status: 'installing'
    })
    return window.api
      .install({
        appName,
        path: `${installPath}`,
        installDlcs,
        sdlList,
        installLanguage,
        runner,
        platformToInstall
      })
      .finally(() => {
        if (progress.percent === 100) {
          storage.removeItem(appName)
        }
        return
      })
  }

  // If the user changed the previous folder, the percentage should start from zero again.
  let path = installPath
  if (installPath === 'default') {
    const { defaultInstallPath }: AppSettings =
      await window.api.requestSettings('default')
    path = defaultInstallPath
  }
  if (previousProgress && previousProgress.folder !== path) {
    storage.removeItem(appName)
  }

  return window.api
    .install({
      appName,
      path: `${path}`,
      installDlcs,
      sdlList,
      runner,
      platformToInstall
    })
    .finally(() => {
      if (progress.percent === 100) {
        storage.removeItem(appName)
      }
      return
    })
}

const importGame = window.api.importGame

async function handleStopInstallation(
  appName: string,
  [path, folderName]: string[],
  t: TFunction<'gamepage'>,
  progress: InstallProgress,
  runner: Runner,
  showDialogModal: (options: DialogModalOptions) => void
) {
  showDialogModal({
    title: t('gamepage:box.stopInstall.title'),
    message: t('gamepage:box.stopInstall.message'),
    buttons: [
      { text: t('gamepage:box.stopInstall.keepInstalling') },
      {
        text: t('box.yes'),
        onClick: () => {
          storage.setItem(
            appName,
            JSON.stringify({ ...progress, folder: path })
          )
          sendKill(appName, runner)
        }
      },
      {
        text: t('box.no'),
        onClick: async () => {
          await sendKill(appName, runner)
          storage.removeItem(appName)
          window.api.removeFolder([path, folderName])
        }
      }
    ]
  })
}

const repair = async (appName: string, runner: Runner): Promise<void> =>
  window.api.repair(appName, runner)

type LaunchOptions = {
  appName: string
  t: TFunction<'gamepage'>
  launchArguments?: string
  runner: Runner
  hasUpdate: boolean
  showDialogModal: (options: DialogModalOptions) => void
}

const launch = async ({
  appName,
  t,
  launchArguments,
  runner,
  hasUpdate,
  showDialogModal
}: LaunchOptions): Promise<void> => {
  if (hasUpdate) {
    // promisifies the showDialogModal button click callbacks
    const launchFinished = new Promise<void>((res) => {
      showDialogModal({
        message: t('gamepage:box.update.message'),
        title: t('gamepage:box.update.title'),
        buttons: [
          {
            text: t('gamepage:box.yes'),
            onClick: async () => {
              await updateGame(appName, runner)
              res()
            }
          },
          {
            text: t('box.no'),
            onClick: async () => {
              await window.api.launch({
                appName,
                runner,
                launchArguments: '--skip-version-check'
              })
              res()
            }
          }
        ]
      })
    })

    return launchFinished
  }
  if (launchArguments === undefined) launchArguments = ''
  return window.api.launch({ appName, launchArguments, runner })
}

const updateGame = window.api.updateGame

// Todo: Get Back to update all games
// function updateAllGames(gameList: Array<string>) {
//   gameList.forEach(async (appName) => {
//     await updateGame(appName)
//   })
// }

type RecentGame = {
  appName: string
  title: string
}

function getRecentGames(libraries: GameInfo[]): GameInfo[] {
  const recentGames =
    (configStore.get('games.recent', []) as Array<RecentGame>) || []

  return libraries.filter((game: GameInfo) =>
    recentGames.some((recent) => {
      if (!recent || !game) {
        return false
      }
      return recent.appName === game.app_name
    })
  )
}

export const epicCategories = ['all', 'legendary', 'epic']
export const gogCategories = ['all', 'gog']

export {
  handleStopInstallation,
  getRecentGames,
  install,
  launch,
  repair,
  //updateAllGames,
  updateGame
}
