import {
  AppSettings,
  GameInfo,
  InstallProgress,
  Runner,
  GameSettings,
  InstallPlatform
} from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'

import { install, launch, repair, updateGame } from './library'
import fileSize from 'filesize'
const readFile = window.api.readConfig

const writeConfig = window.api.writeConfig

const notify = ([title, message]: [title: string, message: string]): void =>
  window.api.notify([title, message])

const loginPage = window.api.openLoginPage

const getPlatform = window.api.getPlatform

const sidInfoPage = window.api.openSidInfoPage

const handleKofi = window.api.openSupportPage

const handleQuit = window.api.quit

const openAboutWindow = window.api.showAboutWindow

const openDiscordLink = window.api.openDiscordLink

export const size = fileSize.partial({ base: 2 })

let progress: string

const sendKill = window.api.kill

const isLoggedIn = window.api.isLoggedIn

const syncSaves = async (
  savesPath: string,
  appName: string,
  runner: Runner,
  arg?: string
): Promise<string> => {
  const { user } = await window.api.getUserInfo()
  const path = savesPath.replace('~', `/home/${user}`)

  const response: string = await window.api.syncSaves([
    arg,
    path,
    appName,
    runner
  ])
  return response
}

const getLegendaryConfig = async (): Promise<{
  library: GameInfo[]
  user: string
}> => {
  const user: string = await readFile('user')
  const library: Array<GameInfo> = await readFile('library')

  if (!user) {
    return { library: [], user: '' }
  }

  return { library, user }
}

const getGameInfo = async (
  appName: string,
  runner: Runner
): Promise<GameInfo> => {
  return window.api.getGameInfo(appName, runner)
}

const getGameSettings = async (
  appName: string,
  runner: Runner
): Promise<GameSettings> => {
  return window.api.getGameSettings(appName, runner)
}

const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform: InstallPlatform
): Promise<LegendaryInstallInfo | GogInstallInfo | null> => {
  return window.api.getInstallInfo(appName, runner, installPlatform)
}

const createNewWindow = (url: string) => window.api.createNewWindow(url)

function getProgress(progress: InstallProgress): number {
  if (progress && progress.percent) {
    const percent = progress.percent
    // this should deal with a few edge cases
    if (typeof percent === 'string') {
      return Number(String(percent).replace('%', ''))
    }
    return percent
  }
  return 0
}

async function fixGogSaveFolder(
  folder: string,
  installedPlatform: string,
  appName: string
) {
  const isMac = installedPlatform === 'osx'
  const isWindows = installedPlatform === 'windows'
  const matches = folder.match(/<\?(\w+)\?>/)
  if (!matches) {
    return folder
  }

  switch (matches[1]) {
    case 'SAVED_GAMES':
      // This path is only on Windows
      folder = folder.replace(matches[0], '%USERPROFILE%/Saved Games')
      break
    case 'APPLICATION_DATA_LOCAL':
      folder = folder.replace(matches[0], '%LOCALAPPDATA%')
      break
    case 'APPLICATION_DATA_LOCAL_LOW':
      folder = folder.replace(matches[0], '%USERPROFILE%/AppData/LocalLow')
      break
    case 'APPLICATION_DATA_ROAMING':
      folder = folder.replace(matches[0], '%APPDATA%')
      break
    case 'DOCUMENTS':
      if (isWindows) {
        const documentsResult = await window.api.runWineCommandForGame({
          appName,
          runner: 'gog',
          command:
            'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders" /v Personal'
        })
        const documentsFolder = documentsResult.stdout
          ?.trim()
          .split('\n')[1]
          ?.trim()
          .split('    ')
          .pop()

        folder = folder.replace(
          matches[0],
          documentsFolder ?? '%USERPROFILE%/Documents'
        )
      } else if (isMac) {
        folder = folder.replace(matches[0], '$HOME/Documents')
      }
      break
    case 'APPLICATION_SUPPORT':
      folder = folder.replace(matches[0], '$HOME/Library/Application Support')
  }
  return folder
}

async function fixLegendarySaveFolder(
  appName: string,
  folder: string,
  prefix: string,
  isProton: boolean
) {
  const { user, account_id: epicId } = await window.api.getUserInfo()
  const username = isProton ? 'steamuser' : user

  folder = folder.replace('{EpicID}', epicId)
  folder = folder.replace('{EpicId}', epicId)

  if (folder.includes('locallow')) {
    return folder.replace(
      '{appdata}/../locallow',
      `%USERPROFILE%/AppData/LocalLow`
    )
  }

  if (folder.includes('LocalLow')) {
    return folder.replace(
      '{AppData}/../LocalLow',
      `%USERPROFILE%/AppData/LocalLow`
    )
  }

  if (folder.includes('{UserSavedGames}')) {
    return folder.replace('{UserSavedGames}', `%USERPROFILE%/Saved Games`)
  }

  if (folder.includes('{usersavedgames}')) {
    return folder.replace('{usersavedgames}', `%USERPROFILE%/Saved Games`)
  }

  if (folder.includes('roaming')) {
    return folder.replace(
      '{appdata}/../roaming',
      `%USERPROFILE%/Application Data`
    )
  }

  if (folder.includes('{appdata}/../Roaming/')) {
    return folder.replace(
      '{appdata}/../Roaming',
      `%USERPROFILE%/Application Data`
    )
  }

  if (folder.includes('Roaming')) {
    return folder.replace(
      '{AppData}/../Roaming',
      `%USERPROFILE%/Application Data`
    )
  }

  if (folder.includes('{AppData}')) {
    return folder.replace(
      '{AppData}',
      `%USERPROFILE%/Local Settings/Application Data`
    )
  }

  if (folder.includes('{appdata}')) {
    return folder.replace(
      '{appdata}',
      `%USERPROFILE%/Local Settings/Application Data`
    )
  }

  if (folder.includes('{userdir}')) {
    return folder.replace('{userdir}', `/users/${username}/Documents`)
  }

  if (folder.includes('{UserDir}')) {
    const documentsResult = await window.api.runWineCommandForGame({
      appName,
      runner: 'legendary',
      command:
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders" /v Personal'
    })
    const documentsFolder = documentsResult.stdout
      ?.trim()
      .split('\n')[1]
      ?.trim()
      .split('    ')
      .pop()
    return folder.replace(
      '{UserDir}',
      documentsFolder ?? `%USERPROFILE%/Documents`
    )
  }

  return folder
}

async function getAppSettings(): Promise<AppSettings> {
  return window.api.requestSettings('default')
}

function quoteIfNecessary(stringToQuote: string) {
  if (stringToQuote.includes(' ')) {
    return `"${stringToQuote}"`
  }
  return stringToQuote
}

export {
  createNewWindow,
  fixLegendarySaveFolder,
  fixGogSaveFolder,
  getGameInfo,
  getGameSettings,
  getInstallInfo,
  getLegendaryConfig,
  getPlatform,
  getProgress,
  getAppSettings,
  handleKofi,
  handleQuit,
  install,
  isLoggedIn,
  launch,
  loginPage,
  notify,
  openAboutWindow,
  openDiscordLink,
  progress,
  repair,
  sendKill,
  sidInfoPage,
  syncSaves,
  updateGame,
  writeConfig,
  quoteIfNecessary
}
