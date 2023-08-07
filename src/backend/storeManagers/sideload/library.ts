import { isMac } from 'backend/constants'
import {
  CallRunnerOptions,
  ExecResult,
  GameInfo,
  InstallPlatform
} from 'common/types'
import { readdirSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { libraryStore } from './electronStores'
import { logWarning } from 'backend/logger/logger'
import { addShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'

export function addNewApp({
  app_name,
  title,
  install: { executable, platform },
  art_cover,
  art_square,
  browserUrl,
  is_installed = true,
  description
}: GameInfo): void {
  const game: GameInfo = {
    runner: 'sideload',
    app_name,
    title,
    install: {
      executable,
      platform,
      is_dlc: false
    },
    folder_name: executable !== undefined ? dirname(executable) : undefined,
    art_cover,
    is_installed: is_installed !== undefined ? is_installed : true,
    art_square,
    canRunOffline: !browserUrl,
    browserUrl,
    description
  }

  if (isMac && executable?.endsWith('.app')) {
    const macAppExecutable = readdirSync(
      join(executable, 'Contents', 'MacOS')
    )[0]
    game.install.executable = join(
      executable,
      'Contents',
      'MacOS',
      macAppExecutable
    )
  }

  const current = libraryStore.get('games', [])

  const gameIndex = current.findIndex((value) => value.app_name === app_name)

  // edit app in case it exists
  if (gameIndex !== -1) {
    current[gameIndex] = { ...current[gameIndex], ...game }
  } else {
    current.push(game)
    addShortcuts(game)
  }

  libraryStore.set('games', current)
  return
}

/* eslint-disable @typescript-eslint/no-unused-vars */

export function installState(appName: string, state: boolean) {
  logWarning(`installState not implemented on Sideload Library Manager`)
}

export async function refresh() {
  logWarning(`refresh not implemented on Sideload Library Manager`)
  return null
}

export function getGameInfo(appName: string, forceReload?: boolean): GameInfo {
  logWarning(`getGameInfo not implemented on Sideload Library Manager`)
  return {
    app_name: '',
    runner: 'sideload',
    art_cover: '',
    art_square: '',
    install: {},
    is_installed: false,
    title: '',
    canRunOffline: false
  }
}

export async function listUpdateableGames(): Promise<string[]> {
  logWarning(`listUpdateableGames not implemented on Sideload Library Manager`)
  return []
}

export async function runRunnerCommand(
  commandParts: string[],
  abortController: AbortController,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  logWarning(`runRunnerCommand not implemented on Sideload Library Manager`)
  return { stdout: '', stderr: '' }
}

export async function changeGameInstallPath(
  appName: string,
  newPath: string
): Promise<void> {
  logWarning(
    `changeGameInstallPath not implemented on Sideload Library Manager`
  )
}

export async function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform,
  lang?: string
): Promise<undefined> {
  logWarning(`getInstallInfo not implemented on Sideload Library Manager`)
  return undefined
}
