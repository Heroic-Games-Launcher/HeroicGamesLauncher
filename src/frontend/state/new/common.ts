import { WineInstallation } from 'common/types'
import { Game } from './Game'

export type GameInstallationSettings = {
  installPath: string
  wine?: {
    winePrefix: string
    wineVersion: WineInstallation
  }
  installDlcs?: boolean
  sdlList?: Array<string>
  game: Game
}
