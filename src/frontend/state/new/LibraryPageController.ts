import { makeAutoObservable } from 'mobx'
import { Box } from './utils'
import { Category } from '../../types'
import LibraryListControler from './LibraryListController'
import { LibraryPaginationOptions } from './LibraryPagination'
import { GlobalStore } from './GlobalStore'

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
    makeAutoObservable(this)
  }

  private get paginationOptions(): Partial<LibraryPaginationOptions> {
    return {
      termBox: this.search,
      categoryBox: this.category
    }
  }
}
