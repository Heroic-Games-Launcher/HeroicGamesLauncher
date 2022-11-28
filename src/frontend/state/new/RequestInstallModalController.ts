import { Game } from './Game'
import { GameInstallSettings } from './common'
import { makeAutoObservable } from 'mobx'

type RequestInstallOptions = {
  game: Game
  defaultValues?: Partial<GameInstallSettings>
  onSend: (data: GameInstallSettings) => void
}

export default class RequestInstallModalController {
  options?: RequestInstallOptions
  opened = false

  constructor() {
    makeAutoObservable(this)
  }

  async requestInstallSettings(game: Game) {
    return new Promise<GameInstallSettings>((resolve) => {
      this.show({
        game,
        onSend: resolve
      })
    })
  }

  show(options: RequestInstallOptions) {
    this.options = options
    this.opened = true
  }

  send(request: Omit<GameInstallSettings, 'game'>) {
    if (this.options) {
      this.options.onSend({ ...request, game: this.options.game })
      this.options = undefined
      this.opened = false
    }
  }

  cancelRequest() {
    this.options = undefined
    this.opened = false
  }
}
