import { ExecResult, ExtraInfo, GameInfo, GameSettings, GameStatus } from './types';

type Runner = 'legendary' | 'gog'
abstract class Game {
  public static get(appName : string, runner : Runner = 'legendary') {
    if (runner === 'legendary') {
      return LegendaryGame.get(appName)
    }
    else if (runner === 'gog') {
      console.log('GOG integration is unimplemented.')
      return null
    }
  }

  abstract appName: string
  abstract getExtraInfo(namespace : string) : Promise<ExtraInfo>
  abstract getGameInfo() : Promise<GameInfo>
  abstract getSettings() : Promise<GameSettings>
  abstract hasUpdate() : Promise<boolean>
  abstract import(path : string) : Promise<ExecResult>
  abstract install(path : string) : Promise<ExecResult>
  abstract addDesktopShortcut(): Promise<void>
  abstract launch() : Promise<ExecResult>
  abstract moveInstall(newInstallPath : string) : Promise<string>
  abstract repair() : Promise<ExecResult>
  abstract state: GameStatus
  abstract stop(): void
  abstract syncSaves(arg : string, path : string) : Promise<ExecResult>
  abstract uninstall() : Promise<ExecResult>
  abstract update() : Promise<ExecResult>
}

import { LegendaryGame } from './legendary/games'

export {
  Game,
  Runner
}
