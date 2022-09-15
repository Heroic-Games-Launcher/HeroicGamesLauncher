import { Game } from '../games'
import { GameSettings, ExecResult, GameInfo } from '../../common/types'
import { BrowserWindow } from 'electron/main'
import { libraryStore } from './electronStores'
import { GameConfig } from 'backend/game_config'
import { runWineCommand } from 'backend/launcher'
import { isWindows, isMac, isLinux, execOptions } from 'backend/constants'
import { execAsync, killPattern } from 'backend/utils'
import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
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

export default class SideloadGames extends Game {
  public appName: string
  public window = BrowserWindow.getAllWindows()[0]
  private static instances = new Map<string, SideloadGames>()

  private constructor(appName: string) {
    super()
    this.appName = appName
  }

  public static get(appName: string) {
    if (!this.instances.get(appName)) {
      this.instances.set(appName, new SideloadGames(appName))
    }
    return this.instances.get(appName) as SideloadGames
  }

  public getGameInfo(): GameInfo {
    return libraryStore.get(this.appName, {}) as GameInfo
  }

  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }

  public install(app: SideloadGame) {
    return libraryStore.set(this.appName, app)
  }
  public async addShortcuts(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  public async launch(launchArguments?: string | undefined): Promise<boolean> {
    const {
      install: { executable }
    } = this.getGameInfo()
    if (executable) {
      console.log({ launchArguments })
      return this.runWineCommand(executable)
        .then(() => true)
        .catch(() => false)
    }
    return false
  }

  public async moveInstall(newInstallPath: string): Promise<string> {
    const {
      install: { install_path },
      title
    } = this.getGameInfo()

    if (!install_path) {
      return ''
    }

    if (isWindows) {
      newInstallPath += '\\' + install_path.split('\\').at(-1)
    } else {
      newInstallPath += '/' + install_path.split('/').at(-1)
    }

    logInfo(`Moving ${title} to ${newInstallPath}`, LogPrefix.Backend)
    await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
      .then(() => {
        SideLoadLibrary.get().changeGameInstallPath(
          this.appName,
          newInstallPath
        )
        logInfo(`Finished Moving ${title}`, LogPrefix.Gog)
      })
      .catch((error) => logError(`${error}`, LogPrefix.Gog))
    return newInstallPath
  }

  public async stop(): Promise<void> {
    const {
      install: { executable }
    } = this.getGameInfo()

    if (executable) {
      killPattern(executable)
    }
  }

  public uninstall(): void {
    return libraryStore.delete(this.appName)
  }
  public isNative(): boolean {
    const gameInfo = this.getGameInfo()
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

  public async runWineCommand(
    command: string,
    wait?: boolean | undefined
  ): Promise<ExecResult> {
    return runWineCommand(this, command, Boolean(wait))
  }
}
