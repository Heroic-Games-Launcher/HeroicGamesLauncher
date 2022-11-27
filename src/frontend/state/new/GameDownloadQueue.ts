import { InstallPlatform } from 'common/types'
import { writeConfig } from 'frontend/helpers'
import { find, remove } from 'lodash'
import { makeAutoObservable, runInAction } from 'mobx'
import { GameInstallationSettings } from './common'
import { Game } from './Game'
import { GlobalStore } from './GlobalStore'

export class GameDownloadQueue {
  queue: GameInstallationSettings[] = []

  constructor(private globalStore: GlobalStore) {
    makeAutoObservable(this)
  }

  async addGame(game: Game) {
    if (!game.isInstalled && !game.isQueued) {
      const requestInstall = await new Promise<GameInstallationSettings>(
        (resolve) => {
          this.globalStore.requestInstallModal.show({
            game,
            onSend(data) {
              resolve(data)
            }
          })
        }
      )
      // Write Default game config with prefix on linux
      if (this.globalStore.isLinux) {
        const gameSettings = await window.api.requestGameSettings(
          game.data.app_name
        )

        if (requestInstall.wine) {
          writeConfig({
            appName: game.data.app_name,
            config: { ...gameSettings, ...requestInstall.wine }
          })
        }
      }

      window.api.install({
        appName: game.data.app_name,
        path: requestInstall.installPath,
        installDlcs: requestInstall.installDlcs,
        sdlList: requestInstall.sdlList,
        installLanguage: this.globalStore.language,
        runner: game.data.runner,
        platformToInstall: this.globalStore.platform as InstallPlatform,
        gameInfo: game.data
      })

      runInAction(() => {
        game.changeStatus('queued')
        this.queue.push(requestInstall)
      })
    }
  }

  removeGame(game: Game) {
    remove(this.queue, { game: { data: { app_name: game.data.app_name } } })
    window.api.removeFromDMQueue(game.data.app_name)
  }

  getInQueueGame(name: string) {
    return find(this.queue, { game: { data: { app_name: name } } })?.game
  }
}
