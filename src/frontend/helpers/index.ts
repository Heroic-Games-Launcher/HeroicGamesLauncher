import {
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

const notify = (args: { title: string; body: string }) =>
  window.api.notify(args)

const loginPage = window.api.openLoginPage

const getPlatform = window.api.getPlatform

const sidInfoPage = window.api.openSidInfoPage

const handleQuit = window.api.quit

const openDiscordLink = window.api.openDiscordLink

export const size = fileSize.partial({ base: 2 })

const sendKill = window.api.kill

const syncSaves = async (
  savesPath: string,
  appName: string,
  runner: Runner,
  arg?: string
): Promise<string> => {
  const response: string = await window.api.syncSaves({
    arg,
    path: savesPath,
    appName,
    runner
  })
  return response
}

const getLegendaryConfig = async (): Promise<{
  library: GameInfo[]
  user: string
}> => {
  // TODO: I'd say we should refactor this to be two different IPC calls, makes type annotations easier
  const library: GameInfo[] = (await readFile('library')) as GameInfo[]
  const user: string = (await readFile('user')) as string

  if (!user) {
    return { library: [], user: '' }
  }

  return { library, user }
}

const getGameInfo = async (appName: string, runner: Runner) => {
  return window.api.getGameInfo(appName, runner)
}

const getGameSettings = async (
  appName: string,
  runner: Runner
): Promise<GameSettings | null> => {
  return window.api.getGameSettings(appName, runner)
}

const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform: InstallPlatform
): Promise<LegendaryInstallInfo | GogInstallInfo | null> => {
  return window.api.getInstallInfo(
    appName,
    runner,
    handleRunnersPlatforms(installPlatform, runner)
  )
}

function handleRunnersPlatforms(
  platform: InstallPlatform,
  runner: Runner
): InstallPlatform {
  if (runner === 'legendary') {
    return platform
  }
  switch (platform) {
    case 'Mac':
      return 'osx'
    case 'Windows':
      return 'windows'
    // GOG doesn't have a linux platform, so we need to get the information as windows
    case 'linux':
      return 'windows'
    default:
      return platform
  }
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

function removeSpecialcharacters(text: string): string {
  const regexp = new RegExp(/[:|/|*|?|<|>|\\|&|{|}|%|$|@|`|!|™|+|'|"|®]/, 'gi')
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
  handleQuit,
  install,
  launch,
  loginPage,
  notify,
  openDiscordLink,
  repair,
  sendKill,
  sidInfoPage,
  syncSaves,
  updateGame,
  writeConfig,
  removeSpecialcharacters,
  getStoreName
}
