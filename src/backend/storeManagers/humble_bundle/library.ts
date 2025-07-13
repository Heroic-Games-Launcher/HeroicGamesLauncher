import {
  ExecResult,
  GameInfo,
  InstallInfo,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { HumbleBundleUser } from './user'

const defaultExecResult = {
  stderr: '',
  stdout: ''
}

export async function refresh(): Promise<ExecResult | null> {
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return defaultExecResult
  }
  loadGamesInAccount()
  return defaultExecResult
}

export function getGameInfo(
  appName: string,
  forceReload?: boolean
): GameInfo | undefined {
  return undefined
}

export function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform,
  options: {
    branch?: string
    build?: string
    lang?: string
    retries?: number
  }
): Promise<InstallInfo | undefined> {
  return Promise.resolve(undefined)
}

export function listUpdateableGames(): Promise<string[]> {
  return Promise.resolve([])
}

export function changeGameInstallPath(appName: string, newPath: string) {
  return Promise.resolve()
}

export function changeVersionPinnedStatus(appName: string, status: boolean) {}

export function installState(appName: string, state: boolean) {}

export function getLaunchOptions(
  appName: string
): LaunchOption[] | Promise<LaunchOption[]> {
  return [
    {
      type: 'basic',
      name: '',
      parameters: ''
    }
  ]
}

async function loadGamesInAccount() {
  if (!(await HumbleBundleUser.isLoggedIn())) {
    return
  }

  console.log('refetching games humble')
}
