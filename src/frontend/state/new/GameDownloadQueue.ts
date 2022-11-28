import { writeConfig } from 'frontend/helpers'
import { find, merge, remove } from 'lodash'
import { makeAutoObservable, runInAction, toJS } from 'mobx'
import { GameInstallSettings } from './common'
import { Game } from './Game'
import { GlobalStore } from './GlobalStore'
import { InstallPlatform } from '../../../common/types'

export class GameDownloadQueue {
  queue: GameInstallSettings[] = []

  constructor(private globalStore: GlobalStore) {
    makeAutoObservable(this)
  }

  async addGame(game: Game) {
    if (!game.isInstalled && !game.isQueued) {
      const settings =
        await this.globalStore.requestInstallModal.requestInstallSettings(game)

      // Write Default game config with prefix on linux
      if (this.globalStore.isLinux) {
        const globalSettings = await window.api.requestGameSettings(
          game.data.app_name
        )

        writeConfig({
          appName: game.data.app_name,
          config: merge({
            ...globalSettings,
            ...settings.wine,
            wineVersion: {
              bin:
                settings.wine?.wineVersion?.bin ||
                globalSettings.wineVersion?.bin
            }
          })
        })
      }

      window.api.install({
        appName: game.data.app_name,
        path: toJS(settings.installPath),
        installDlcs: toJS(settings.installDlcs),
        sdlList: toJS(settings.sdlList),
        installLanguage: this.globalStore.language,
        runner: game.data.runner,
        platformToInstall: this.globalStore.platform as InstallPlatform,
        gameInfo: toJS(game.data)
      })

      runInAction(() => {
        this.queue.push(settings)
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
