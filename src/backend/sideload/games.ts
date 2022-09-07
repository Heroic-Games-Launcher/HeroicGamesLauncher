import { Game } from '../games'
import { GameSettings, ExecResult, GameInfo } from '../../common/types'
import { BrowserWindow } from 'electron/main'
import { libraryStore } from './electronStores'

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

  public getGameInfo(installPlatform?: string | undefined): GameInfo {
    throw new Error('Method not implemented.')
  }
  public getSettings(): Promise<GameSettings> {
    throw new Error('Method not implemented.')
  }
  public install(app: SideloadGame) {
    return libraryStore.set(this.appName, app)
  }
  public addShortcuts(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  public launch(launchArguments?: string | undefined): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  public moveInstall(newInstallPath: string): Promise<string> {
    throw new Error('Method not implemented.')
  }
  public stop(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  public uninstall(): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
  public isNative(): boolean {
    throw new Error('Method not implemented.')
  }
  public runWineCommand(
    command: string,
    wait?: boolean | undefined
  ): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
}
