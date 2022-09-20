import { GameSettings, GameInfo } from '../../common/types'
import { libraryStore } from './electronStores'
import { GameConfig } from '../game_config'
import { isWindows, isMac, isLinux, execOptions } from '../constants'
import { execAsync, killPattern } from '../utils'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { SideLoadLibrary } from './library'

interface SideloadGame {
  runner: string
  app_name: string
  art_cover: string
  folder_name: string
  title: string
  install: {
    executable: string
    platform: 'native' | 'windows'
  }
}

const SideloadGames = {
  getGameInfo(appName: string): GameInfo {
    return libraryStore.get(appName, {}) as GameInfo
  },

  async getSettings(appName: string): Promise<GameSettings> {
    return (
      GameConfig.get(appName).config ||
      (await GameConfig.get(appName).getSettings())
    )
  },

  install(app: SideloadGame): void {
    return libraryStore.set(app.app_name, app)
  },
  async addShortcuts(): Promise<void> {
    throw new Error('Method not implemented.')
  },

  async launch(
    appName: string,
    launchArguments?: string | undefined
  ): Promise<boolean> {
    const {
      install: { executable }
    } = this.getGameInfo(appName)
    if (executable) {
      console.log({ launchArguments, executable })
    }
    return false
  },

  async moveInstall(appName: string, newInstallPath: string): Promise<string> {
    const {
      install: { install_path },
      title
    } = this.getGameInfo(appName)

    if (!install_path) {
      return ''
    }

    if (isWindows) {
      newInstallPath += '\\' + install_path.split('\\').at(-1)
    } else {
      newInstallPath += '/' + install_path.split('/').at(-1)
    }

    logInfo(`Moving ${title} to ${newInstallPath}`, {
      prefix: LogPrefix.Backend
    })
    await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
      .then(() => {
        SideLoadLibrary.get().changeGameInstallPath(appName, newInstallPath)
        logInfo(`Finished Moving ${title}`, { prefix: LogPrefix.Backend })
      })
      .catch((error) => logError(`${error}`, { prefix: LogPrefix.Backend }))
    return newInstallPath
  },

  async stop(appName: string): Promise<void> {
    const {
      install: { executable }
    } = this.getGameInfo(appName)

    if (executable) {
      killPattern(executable)
    }
  },

  uninstall(appName: string): void {
    return libraryStore.delete(appName)
  },

  isNative(appName: string): boolean {
    const gameInfo = this.getGameInfo(appName)
    if (isWindows) {
      return true
    }

    if (isMac && gameInfo.install.platform === 'osx') {
      return true
    }

    if (isLinux && gameInfo.install.platform === 'linux') {
      return true
    }

    return false
  }
}

export default SideloadGames
