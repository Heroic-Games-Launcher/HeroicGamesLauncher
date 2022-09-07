import { InstallPlatform } from 'common/types'
import {
  AppSettings,
  GameInfo,
  GameStatus,
  InstallProgress,
  Runner
} from 'common/types'

import { TFunction } from 'react-i18next'
import { getGameInfo, getPlatform, sendKill, getGameSettings } from './index'
import { configStore } from './electronStores'

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
  platformToInstall = 'Windows'
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
      runner
    )
  }

  if (is_installed) {
    return uninstall({ appName, handleGameStatus, t, runner })
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
      runner
    })
    .finally(() => {
      if (progress.percent === 100) {
        storage.removeItem(appName)
      }
      return
    })
}

const importGame = window.api.importGame

type UninstallArgs = {
  appName: string
  handleGameStatus: (game: GameStatus) => Promise<void>
  t: TFunction<'gamepage'>
  runner: Runner
}

async function uninstall({
  appName,
  handleGameStatus,
  t,
  runner
}: UninstallArgs) {
  const args = {
    buttons: [t('box.yes'), t('box.no')],
    message: t('gamepage:box.uninstall.message'),
    title: t('gamepage:box.uninstall.title'),
    type: 'warning'
  }
  const platform = await getPlatform()
  const {
    install: { platform: installedplatform }
  } = await getGameInfo(appName, runner)

  let linuxArgs
  // This assumes native games are installed should be changed in the future
  // if we add option to install windows games even if native is available
  if (platform === 'linux' && installedplatform?.toLowerCase() === 'windows') {
    const wineprefix = (await getGameSettings(appName, runner)).winePrefix

    linuxArgs = {
      checkboxLabel: t('gamepage:box.uninstall.checkbox', {
        defaultValue:
          "Remove prefix: {{prefix}}{{newLine}}Note: This can't be undone and will also remove not backed up save files.",
        prefix: wineprefix,
        newLine: '\n'
      }),
      checkboxChecked: false
    }
  }

  const { response, checkboxChecked } = await window.api.openMessageBox({
    ...args,
    ...linuxArgs
  })

  if (response === 0) {
    await handleGameStatus({ appName, runner, status: 'uninstalling' })
    await window.api.uninstall([appName, checkboxChecked, runner])
    storage.removeItem(appName)
    return handleGameStatus({ appName, runner, status: 'done' })
  }
  return
}

async function handleStopInstallation(
  appName: string,
  [path, folderName]: string[],
  t: TFunction<'gamepage'>,
  progress: InstallProgress,
  runner: Runner
) {
  const args = {
    buttons: [
      t('gamepage:box.stopInstall.keepInstalling'),
      t('box.yes'),
      t('box.no')
    ],
    message: t('gamepage:box.stopInstall.message'),
    title: t('gamepage:box.stopInstall.title'),
    cancelId: 0
  }

  const { response } = await window.api.openMessageBox(args)

  if (response === 1) {
    storage.setItem(appName, JSON.stringify({ ...progress, folder: path }))
    return sendKill(appName, runner)
  } else if (response === 2) {
    await sendKill(appName, runner)
    storage.removeItem(appName)
    return window.api.removeFolder([path, folderName])
  }
}

const repair = async (appName: string, runner: Runner): Promise<void> =>
  window.api.repair(appName, runner)

type LaunchOptions = {
  appName: string
  t: TFunction<'gamepage'>
  launchArguments?: string
  runner: Runner
  hasUpdate: boolean
}

const launch = async ({
  appName,
  t,
  launchArguments,
  runner,
  hasUpdate
}: LaunchOptions): Promise<void> => {
  if (hasUpdate) {
    const args = {
      buttons: [t('gamepage:box.yes'), t('box.no')],
      message: t('gamepage:box.update.message'),
      title: t('gamepage:box.update.title')
    }

    const { response } = await window.api.openMessageBox(args)

    if (response === 0) {
      return updateGame(appName, runner)
    }

    return window.api.launch({
      appName,
      runner,
      launchArguments: '--skip-version-check'
    })
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
    (configStore.get('games.recent', []) as Array<RecentGame>).filter(
      Boolean
    ) || []

  return libraries.filter((game: GameInfo) =>
    recentGames.some((recent) => recent.appName === game.app_name)
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
  uninstall,
  // updateAllGames,
  updateGame
}
