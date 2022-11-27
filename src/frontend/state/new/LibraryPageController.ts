import { makeAutoObservable } from 'mobx'
import { Box } from './utils'
import { Category } from '../../types'
import LibraryListControler from './LibraryListController'

export default class LibraryPageController {
  search = Box.create('')
  category = Box.create<Category>('all')
  platform = Box.create('all')
  mainLibrary = new LibraryListControler()
  recentGames = new LibraryListControler()
  favouritesLibrary = new LibraryListControler()
  constructor() {
    makeAutoObservable(this)
  }
}
