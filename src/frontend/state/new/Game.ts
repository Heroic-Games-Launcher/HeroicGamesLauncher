import { GameInfo, GameStatus } from 'common/types'
import { makeAutoObservable } from 'mobx'
import { bridgeStore } from '../GlobalState'
// import { GameDownloadQueue } from './GameDownloadQueue'

export class Game {
  constructor(
    public data: GameInfo // private downloadQueue: GameDownloadQueue
  ) {
    makeAutoObservable(this)
  }

  status?: GameStatus['status']

  isHidden = false
  isFavourite = false
  hasUpdate = false

  install() {
    if (this.isInstalled || this.isInstalling) {
      return
    }
  }

  uninstall() {
    if (!this.isInstalled) {
      return
    }
  }

  get isRecent() {
    return bridgeStore.recentAppNames.includes(this.data.app_name)
  }

  get isInstalled() {
    return this.data.is_installed
  }

  get isInstalling() {
    return this.status === 'installing'
  }

  get isQueued() {
    return this.status === 'queued'
  }

  get isUpdating() {
    return this.status === 'updating'
  }

  get isPlaying() {
    return this.status === 'playing'
  }

  changeStatus(status: GameStatus['status'] | undefined) {
    this.status = status
  }

  hide() {
    this.isHidden = true
  }

  show() {
    this.isHidden = false
  }

  favorite() {
    this.isFavourite = true
  }

  unFavorite() {
    this.isFavourite = false
  }

  stop() {
    this.changeStatus(undefined)
  }

  play() {
    this.changeStatus('playing')
  }

  update() {
    this.changeStatus('updating')
  }

  cancelProgress() {}

  asRecent() {
    // this.isRecent = true
  }

  asNotRecent() {
    // this.isRecent = false
  }

  get downloadProgress() {
    return bridgeStore.installProgressByAppName[this.data.app_name]
  }
}
