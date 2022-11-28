import { GameIdentifier, GameInfo } from 'common/types'
import { autorun, makeAutoObservable } from 'mobx'
import { Game } from '../model/Game'
import { GameDownloadQueue } from '../managers/GameDownloadQueue'
import { configStore, libraryStore } from 'frontend/helpers/electronStores'
import LibraryPageController from '../ui-controllers/LibraryPageController'
import { find } from 'lodash'
import i18next from 'i18next'
import RequestInstallModalController from '../ui-controllers/RequestInstallModalController'
import LayoutPreferences from '../settings/LayoutPreferences'
import { loadGOGLibrary } from '../../GlobalState'

export class GlobalStore {
  language = i18next.language
  platform = 'linux'
  gameDownloadQueue = new GameDownloadQueue(this)
  layoutPreferences = new LayoutPreferences()
  requestInstallModal = new RequestInstallModalController()
  libraryController = new LibraryPageController(this)
  private gameInstancesByAppName: { [key: string]: Game } = {}
  private favouriteStoredGames: GameIdentifier[] = []
  private hiddenStoredGames: GameIdentifier[] = []

  epicLibrary: GameInfo[] = []
  gogLibrary: GameInfo[] = []

  constructor() {
    makeAutoObservable(this)
    this.refresh()

    const syncStoredGameInfoById = (key: string, propertyFrom: string) => {
      autorun(() => {
        // when favouriteGames changed, automatically save to configStore
        console.log(`Syncing ${key}`)
        configStore.set(
          key,
          this[propertyFrom].map((game: Game) => ({
            appName: game.appName,
            title: game.data.title
          }))
        )
      })
    }

    syncStoredGameInfoById('games.favourites', 'favouriteGames')
    syncStoredGameInfoById('games.hidden', 'hiddenGames')
  }

  getGame(name: string): Game {
    return this.gameInstancesByAppName[name]
  }

  get isLinux() {
    return this.platform === 'linux'
  }

  refresh() {
    this.favouriteStoredGames = configStore.get(
      'games.favourites',
      []
    ) as GameIdentifier[]
    this.hiddenStoredGames = configStore.get(
      'games.hidden',
      []
    ) as GameIdentifier[]

    this.epicLibrary = libraryStore.get('library', []) as GameInfo[]
    this.gogLibrary = loadGOGLibrary()

    for (const gameInfo of this.library) {
      const game = new Game(gameInfo)
      game.isFavourite = !!find(this.favouriteStoredGames, {
        appName: game.appName
      })
      game.isHidden = !!find(this.hiddenStoredGames, {
        appName: game.appName
      })
      this.gameInstancesByAppName[gameInfo.app_name] = game
    }
  }

  // library with GameInfo
  get library() {
    return [...this.epicLibrary, ...this.gogLibrary]
  }

  // library with Game instances
  get libraryGames() {
    return Object.values(this.gameInstancesByAppName)
  }

  get favouriteGames() {
    return this.libraryGames.filter((game) => game.isFavourite)
  }

  get hiddenGames() {
    return this.libraryGames.filter((game) => game.isHidden)
  }
}
