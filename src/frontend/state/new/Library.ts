import { makeAutoObservable } from 'mobx'

export class Library {
  refreshing = false

  constructor() {
    makeAutoObservable(this)
  }

  refresh() {
    this.refreshing = true
  }
}
