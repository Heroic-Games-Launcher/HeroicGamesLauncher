import { makeAutoObservable } from 'mobx'

export class Box<T> {
  constructor(private val: T) {
    makeAutoObservable(this)
  }

  set(val: T) {
    this.val = val
  }

  get() {
    return this.val
  }

  is(val: T) {
    return val === this.val
  }

  static create<T>(val: T) {
    return new Box(val)
  }
}
