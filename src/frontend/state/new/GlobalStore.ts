import { TFunction } from 'react-i18next'
import { GameInfo } from 'common/types'
import { makeAutoObservable } from 'mobx'
import { GameInstallationSettings } from './common'
import { Game } from './Game'
import { GameDownloadQueue } from './GameDownloadQueue'
import { libraryStore } from 'frontend/helpers/electronStores'
import LibraryPageController from './LibraryPageController'
import { bridgeStore } from '../GlobalState'

class LayoutPreferences {
  themeName = 'heroic'
  zoomPercent = 100
  primaryFontFamily = ''
  secondaryFontFamily = ''
}

type RequestInstallOptions = {
  game: Game
  defaultValues?: Partial<GameInstallationSettings>
  onSend: (data: GameInstallationSettings) => void
}

class RequestInstallModalController {
  options?: RequestInstallOptions
  opened = false

  constructor() {
    makeAutoObservable(this)
  }

  show(options: RequestInstallOptions) {
    this.options = options
    this.opened = true
  }

  send(request: Omit<GameInstallationSettings, 'game'>) {
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

export class GlobalStore {
  language = 'en'
  platform = 'linux'
  gameDownloadQueue = new GameDownloadQueue(this)
  layoutPreferences = new LayoutPreferences()
  requestInstallModal = new RequestInstallModalController()
  i18n?: TFunction<'gamepage'>
  libraryController = new LibraryPageController()
  private gameInstancesByAppName: { [key: string]: Game } = {}

  epicLibrary: GameInfo[] = []

  constructor() {
    makeAutoObservable(this)
    this.refresh()
  }

  getGame(name: string, info: GameInfo): Game {
    return this.gameDownloadQueue.getInQueueGame(name) || new Game(info)
  }

  get isLinux() {
    return this.platform === 'linux'
  }

  refresh() {
    this.epicLibrary = libraryStore.get('library', []) as GameInfo[]
    for (const gameInfo of this.epicLibrary) {
      this.gameInstancesByAppName[gameInfo.app_name] = new Game(gameInfo)
    }
  }

  get libraryGames() {
    return Object.values(this.gameInstancesByAppName)
  }
}
