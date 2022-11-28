import { autorun, makeAutoObservable, toJS } from 'mobx'
import { Box } from './utils'
import { Category } from '../../types'
import LibraryListControler from './LibraryListController'
import { LibraryPaginationOptions } from './LibraryPagination'
import { GlobalStore } from './GlobalStore'
import { merge, pick } from 'lodash'

const STORAGE_KEY = 'data.library-page'

export default class LibraryPageController {
  readonly search = Box.create('')
  readonly category = Box.create<Category>('all')
  readonly platform = Box.create('all')
  readonly listScrollPosition = Box.create({ left: 0, top: 0 })
  readonly mainLibrary: LibraryListControler
  readonly recentGames: LibraryListControler
  readonly favouritesLibrary: LibraryListControler

  constructor(private globalStore: GlobalStore) {
    this.mainLibrary = new LibraryListControler(
      this.paginationOptions,
      globalStore
    )
    this.recentGames = new LibraryListControler(
      {
        ...this.paginationOptions,
        onlyRecent: true
      },
      globalStore
    )
    this.favouritesLibrary = new LibraryListControler(
      {
        ...this.paginationOptions,
        onlyFavourites: true
      },
      globalStore
    )
    this.loadSaved()
    makeAutoObservable(this)

    autorun(() => {
      const serializeListController = (controller: LibraryListControler) => {
        return toJS(pick(controller, ['sort', 'layout', 'showHidden']))
      }
      console.log('Saving LibraryPageController data')
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mainLibrary: serializeListController(this.mainLibrary),
          recentGames: serializeListController(this.recentGames),
          favouritesLibrary: serializeListController(this.favouritesLibrary)
        })
      )
    })
  }

  loadSaved() {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      merge(this, JSON.parse(savedData))
    }
  }

  private get paginationOptions(): Partial<LibraryPaginationOptions> {
    return {
      termBox: this.search,
      categoryBox: this.category
    }
  }
}
