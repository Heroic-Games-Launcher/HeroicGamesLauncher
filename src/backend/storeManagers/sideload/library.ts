import { ExecResult, GameInfo } from 'common/types'
import { execFileSync } from 'child_process'
import { existsSync, readdirSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { libraryStore } from './electronStores'
import { logWarning } from 'backend/logger'
import { addShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'
import { sendFrontendMessage } from 'backend/ipc'
import { isMac } from 'backend/constants/environment'
import { LibraryManager } from 'common/types/game_manager'
import SideloadGame from './games'

/** Reads CFBundleExecutable, which may be stored as an XML or binary plist */
function getBundleExecutable(appBundle: string): string | undefined {
  const plist = join(appBundle, 'Contents', 'Info.plist')
  if (!existsSync(plist)) return undefined
  try {
    const name = execFileSync(
      '/usr/bin/plutil',
      ['-extract', 'CFBundleExecutable', 'raw', '-o', '-', plist],
      { encoding: 'utf-8' }
    ).trim()
    return name || undefined
  } catch {
    return undefined
  }
}

export default class SideloadLibraryManager implements LibraryManager {
  init = () => Promise.resolve()

  getGame(id: string): SideloadGame {
    return new SideloadGame(id)
  }

  addNewApp({
    app_name,
    title,
    install: { executable, platform },
    art_cover,
    art_square,
    browserUrl,
    is_installed = true,
    description,
    customUserAgent,
    launchFullScreen
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
      description,
      customUserAgent,
      launchFullScreen
    }

    if (isMac && executable?.endsWith('.app')) {
      const macBinDir = join(executable, 'Contents', 'MacOS')
      const bundleBinary =
        getBundleExecutable(executable) ??
        readdirSync(macBinDir).find(
          (file) => !file.startsWith('.') && file !== 'crashpad_handler'
        )
      if (bundleBinary) {
        game.install.executable = join(macBinDir, bundleBinary)
      }
    }

    const current = libraryStore.get('games', [])

    const gameIndex = current.findIndex((value) => value.app_name === app_name)

    // edit app in case it exists
    if (gameIndex !== -1) {
      current[gameIndex] = { ...current[gameIndex], ...game }
    } else {
      current.push(game)
      addShortcuts(new SideloadGame(app_name))
    }

    libraryStore.set('games', current)

    sendFrontendMessage('refreshLibrary', 'sideload')

    return
  }

  installState() {
    logWarning(`installState not implemented on Sideload Library Manager`)
  }

  async refresh() {
    logWarning(`refresh not implemented on Sideload Library Manager`)
    return null
  }

  getGameInfo(): GameInfo {
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

  async listUpdateableGames(): Promise<string[]> {
    logWarning(
      `listUpdateableGames not implemented on Sideload Library Manager`
    )
    return []
  }

  async runRunnerCommand(): Promise<ExecResult> {
    logWarning(`runRunnerCommand not implemented on Sideload Library Manager`)
    return { stdout: '', stderr: '' }
  }

  async changeGameInstallPath(): Promise<void> {
    logWarning(
      `changeGameInstallPath not implemented on Sideload Library Manager`
    )
  }

  async getInstallInfo(): Promise<undefined> {
    logWarning(`getInstallInfo not implemented on Sideload Library Manager`)
    return undefined
  }

  getLaunchOptions = () => []

  changeVersionPinnedStatus() {
    logWarning(
      'changeVersionPinnedStatus not implemented on Sideload Library Manager'
    )
  }
}
