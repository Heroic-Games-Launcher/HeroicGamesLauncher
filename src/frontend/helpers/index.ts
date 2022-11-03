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

const openCustomThemesWiki = window.api.openCustomThemesWiki

export const size = fileSize.partial({ base: 2 })

let progress: string

const sendAbort = window.api.abort
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

async function getAppSettings(): Promise<AppSettings> {
  return window.api.requestSettings('default')
}

function removeSpecialcharacters(text: string): string {
  const regexp = new RegExp('[:|/|*|?|<|>|\\|&|{|}|%|$|@|`|!|™|+]', 'gi')
  return text.replaceAll(regexp, '')
}

const getStoreName = (runner: Runner, other: string) => {
  switch (runner) {
    case 'legendary':
      return 'Epic Games'
    case 'gog':
      return 'GOG'
    default:
      return other
  }
}

export {
  createNewWindow,
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
  openCustomThemesWiki,
  progress,
  repair,
  sendKill,
  sidInfoPage,
  syncSaves,
  updateGame,
  writeConfig,
  sendAbort,
  removeSpecialcharacters,
  getStoreName
}
