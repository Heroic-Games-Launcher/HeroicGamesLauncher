import { Box } from './utils'
import { makeAutoObservable } from 'mobx'
import { SortGame } from './common'

export default class LibraryListControler {
  readonly sort = Box.create<SortGame>('installed')
  readonly layout = Box.create<'grid' | 'list'>('grid')
  readonly showHidden = Box.create(false)

  constructor() {
    makeAutoObservable(this)
  }
}
