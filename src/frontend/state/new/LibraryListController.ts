import { Box } from './utils'
import { makeAutoObservable } from 'mobx'

export default class LibraryListControler {
  readonly sort = Box.create<'descending' | 'installed'>('installed')
  readonly layout = Box.create<'grid' | 'list'>('grid')
  readonly showHidden = Box.create(false)

  constructor() {
    makeAutoObservable(this)
  }
}
