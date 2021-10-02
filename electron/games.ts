import { ExecResult, ExtraInfo, GameInfo, GameSettings, GameStatus, InstallArgs } from './types';

type Runner = 'legendary' | 'gog'
abstract class Game {
  public static get(appName : string, runner : Runner = 'legendary') {
    if (runner === 'legendary') {
      return LegendaryGame.get(appName)
    }
    else if (runner === 'gog') {
      logWarning('GOG integration is unimplemented.')
      return null
    }
  }

  abstract appName: string
  abstract getExtraInfo(namespace : string) : Promise<ExtraInfo>
  abstract getGameInfo() : Promise<GameInfo>
  abstract getSettings() : Promise<GameSettings>
  abstract hasUpdate() : Promise<boolean>
  abstract import(path : string) : Promise<ExecResult>
  abstract install(args: InstallArgs) : Promise<ExecResult>
  abstract addDesktopShortcut(): Promise<void>
  abstract launch() : Promise<ExecResult>
  abstract moveInstall(newInstallPath : string) : Promise<string>
  abstract repair() : Promise<ExecResult>
  abstract state: GameStatus
  abstract stop(): Promise<void>
  abstract syncSaves(arg : string, path : string) : Promise<ExecResult>
  abstract uninstall() : Promise<ExecResult>
  abstract update() : Promise<unknown>
}

import { LegendaryGame } from './legendary/games'
import { logWarning } from './logger';

export {
  Game,
  Runner
}
