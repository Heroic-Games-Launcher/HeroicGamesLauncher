import { GOGCloudSavesLocation, GogInstallInfo } from 'common/types/gog'
import { LegendaryInstallInfo } from 'common/types/legendary'
import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  ProtonVerb,
  InstallPlatform
} from 'common/types'

import { join } from 'path'
import { heroicGamesConfigPath } from './constants'

abstract class Game {
  public get logFileLocation() {
    return join(heroicGamesConfigPath, `${this.appName}-lastPlay.log`)
  }

  abstract appName: string
  abstract getExtraInfo(): Promise<ExtraInfo>
  abstract getGameInfo(installPlatform?: string): GameInfo
  abstract getInstallInfo(
    installPlatform?: InstallPlatform
  ): Promise<LegendaryInstallInfo | GogInstallInfo>
  abstract getSettings(): Promise<GameSettings>
  abstract hasUpdate(): Promise<boolean>
  abstract import(path: string, platform: InstallPlatform): Promise<ExecResult>
  abstract install(args: InstallArgs): Promise<{ status: string }>
  abstract addShortcuts(): Promise<void>
  abstract launch(launchArguments?: string): Promise<boolean>
  abstract stop(): Promise<void>
  abstract moveInstall(newInstallPath: string): Promise<string>
  abstract repair(): Promise<ExecResult>
  abstract forceUninstall(): Promise<void>
  abstract syncSaves(arg: string, path: string): Promise<string>
  abstract syncSaves(
    arg: string,
    path: string,
    gogSaves?: GOGCloudSavesLocation[]
  ): Promise<string>
  abstract uninstall(): Promise<ExecResult>
  abstract update(): Promise<{ status: 'done' | 'error' | 'abort' }>
  abstract isNative(): boolean
  abstract runWineCommand(
    commandParts: string[],
    wait?: boolean,
    protonVerb?: ProtonVerb
  ): Promise<ExecResult>
}

export { Game }
