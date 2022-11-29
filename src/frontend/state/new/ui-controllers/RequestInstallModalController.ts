import { Game } from '../model/Game'
import { GameInstallSettings } from '../common/common'
import { makeAutoObservable } from 'mobx'
import { Runner } from '../../../../common/types'

type RequestInstallOptions = {
  game?: Game
  runner: Runner
  defaultValues?: Partial<GameInstallSettings>
  onSend?: (data: GameInstallSettings) => void
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

  show(options: Partial<RequestInstallOptions>) {
    if (options.game) {
      options.runner = options.game.data.runner
    }
    this.options = options as RequestInstallOptions
    this.opened = true
  }

  send(request: Omit<GameInstallSettings, 'game'>) {
    if (this.options?.onSend) {
      this.options.onSend({ ...request, game: this.options.game! })
      this.options = undefined
      this.opened = false
    }
  }

  cancelRequest() {
    this.options = undefined
    this.opened = false
  }
}
