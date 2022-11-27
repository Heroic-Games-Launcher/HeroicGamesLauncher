import { Box } from './utils'
import { makeAutoObservable } from 'mobx'

export default class LibraryListControler {
  sort = Box.create<'descending' | 'installed'>('installed')
  layout = Box.create<'grid' | 'list'>('grid')
  showHidden = Box.create(false)

  constructor() {
    makeAutoObservable(this)
  }
}
