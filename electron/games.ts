import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallInfo,
  LaunchResult,
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

  abstract appName: string
  abstract window: BrowserWindow
  abstract getExtraInfo(namespace: string): Promise<ExtraInfo>
  abstract getGameInfo(installPlatform?: string): Promise<GameInfo>
  abstract getInstallInfo(installPlatform?: string): Promise<InstallInfo>
  abstract getSettings(): Promise<GameSettings>
  abstract hasUpdate(): Promise<boolean>
  abstract import(path: string): Promise<ExecResult>
  abstract install(args: InstallArgs): Promise<{ status: string }>
  abstract addShortcuts(): Promise<void>
  abstract launch(launchArguments?: string): Promise<ExecResult | LaunchResult>
  abstract moveInstall(newInstallPath: string): Promise<string>
  abstract repair(): Promise<ExecResult>
  abstract stop(): Promise<void>
  abstract forceUninstall(appName: string, runner: string): void
  abstract syncSaves(arg: string, path: string): Promise<ExecResult>
  abstract uninstall(): Promise<ExecResult>
  abstract update(): Promise<{ status: 'done' | 'error' }>
  abstract runWineCommand(
    command: string,
    altWineBin?: string,
    wait?: boolean
  ): Promise<ExecResult>
}

import { LegendaryGame } from './legendary/games'
import { BrowserWindow } from 'electron'
import { GOGGame } from './gog/games'

export { Game, Runner }
