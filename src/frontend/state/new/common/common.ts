import { WineInstallation } from 'common/types'
import { Game } from '../model/Game'

export type GameInstallSettings = {
  installPath: string
  wine?: {
    winePrefix: string
    wineVersion: WineInstallation
  }
  installDlcs?: boolean
  sdlList?: Array<string>
  game: Game
}

export type SortGame =
  | 'ascending'
  | 'descending'
  | 'installed'
  | 'not-installed'
