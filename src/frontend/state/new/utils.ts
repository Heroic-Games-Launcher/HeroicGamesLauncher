import { makeAutoObservable } from 'mobx'
import { LiteralUnion } from 'prettier'

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

  is(...vals: T[]) {
    return !!vals.find((val) => this.val === val)
  }

  // switch<O>(when: { [key: string]: O } & { default: O }) {
  //   for (const val in when) {
  //     if (this.val === val) {
  //       return when[val]
  //     }
  //   }
  //   return when.default
  // }

  setIf(is: T, val: T, otherwise?: T) {
    this.set(this.is(is) ? val : otherwise || this.val)
  }

  static create<T>(val: T) {
    return new Box(val)
  }
}
