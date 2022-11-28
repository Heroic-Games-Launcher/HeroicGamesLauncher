import { Box } from './utils'
import { makeAutoObservable } from 'mobx'
import { SortGame } from './common'
import LibraryPagination, {
  LibraryPaginationOptions
} from './LibraryPagination'
import { GlobalStore } from './GlobalStore'

export default class LibraryListControler {
  readonly sort = Box.create<SortGame>('installed')
  readonly layout = Box.create<'grid' | 'list'>('grid')
  readonly showHidden = Box.create(false)
  readonly pagination: LibraryPagination

  constructor(
    private paginationOptions: Partial<LibraryPaginationOptions>,
    globalStore: GlobalStore
  ) {
    this.pagination = new LibraryPagination({
      ...this.paginationOptions,
      sortBox: this.sort,
      showHiddenBox: this.showHidden,
      rpp: 20,
      globalStore: globalStore
    })
    makeAutoObservable(this)
  }
}
