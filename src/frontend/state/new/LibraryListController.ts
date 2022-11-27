import { Box } from './utils'
import { makeAutoObservable } from 'mobx'

export default class LibraryListControler {
  sort = Box.create<'descending' | 'installed'>('installed')

  constructor() {
    makeAutoObservable(this)
  }
}
