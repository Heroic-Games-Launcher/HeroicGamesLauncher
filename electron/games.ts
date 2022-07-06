import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallInfo,
  Runner
} from './types'

abstract class Game {
  public static get(
    appName: string,
    runner: Runner = 'legendary'
  ): LegendaryGame | GOGGame {
    if (runner === 'legendary') {
      return LegendaryGame.get(appName)
    } else if (runner === 'gog') {
      return GOGGame.get(appName)
    }
  }
  public get logFileLocation() {
    return join(
      heroicGamesConfigPath,
      `${this.appName}-lastPlay.log`
    )
  }

  abstract appName: string
  abstract window: BrowserWindow
  abstract getExtraInfo(): Promise<ExtraInfo>
  abstract getGameInfo(installPlatform?: string): GameInfo
  abstract getInstallInfo(installPlatform?: string): Promise<InstallInfo>
  abstract getSettings(): Promise<GameSettings>
  abstract hasUpdate(): Promise<boolean>
  abstract import(path: string): Promise<ExecResult>
  abstract install(args: InstallArgs): Promise<{ status: string }>
  abstract addShortcuts(): Promise<void>
  abstract launch(launchArguments?: string): Promise<boolean>
  abstract moveInstall(newInstallPath: string): Promise<string>
  abstract repair(): Promise<ExecResult>
  abstract stop(): Promise<void>
  abstract forceUninstall(): Promise<void>
  abstract syncSaves(arg: string, path: string): Promise<ExecResult>
  abstract uninstall(): Promise<ExecResult>
  abstract update(): Promise<{ status: 'done' | 'error' }>
  abstract isNative(): boolean
  abstract runWineCommand(
    command: string,
    altWineBin?: string,
    wait?: boolean
  ): Promise<ExecResult>
}

import { LegendaryGame } from './legendary/games'
import { BrowserWindow } from 'electron'
import { GOGGame } from './gog/games'
import { join } from 'path'
import { heroicGamesConfigPath } from './constants'

export { Game, Runner }
