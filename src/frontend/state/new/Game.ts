import { GameInfo } from 'common/types'
import { makeAutoObservable } from 'mobx'
import { bridgeStore } from './../GlobalState'
// import { GameDownloadQueue } from './GameDownloadQueue'

export class Game {
  constructor(
    public data: GameInfo // private downloadQueue: GameDownloadQueue
  ) {
    makeAutoObservable(this)
  }

  isHidden = false
  isFavourite = false
  isPlaying = false
  isUpdating = false
  isRecent = false
  isQueued = false
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

  get isInstalled() {
    return false
  }

  get isInstalling() {
    return false
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
    this.isPlaying = false
  }

  play() {
    this.isPlaying = true
  }

  update() {
    this.isUpdating = true
  }

  cancelProgress() {}

  asRecent() {
    this.isRecent = true
  }

  asNotRecent() {
    this.isRecent = false
  }

  get downloadProgress() {
    return bridgeStore.installProgressByAppName[this.data.app_name]
  }
}
