import GameStore from './GameStore'
import { makeAutoObservable } from 'mobx'

export default class EpicGameStore extends GameStore {
  constructor() {
    super()
    makeAutoObservable(this)
  }

  async auth(sid: string) {
    // TODO: impl
    const response = await window.api.login(sid)

    if (response.status === 'done') {
      // this.handleSuccessfulLogin('legendary')
    }

    // return response.status
  }

  get name(): string {
    return 'epic-games'
  }
}
