import { GameInfo } from 'common/types'
import { makeAutoObservable } from 'mobx'
import { bridgeStore } from '../GlobalState'
import { launch, sendKill, syncSaves } from '../../helpers'
// import { GameDownloadQueue } from './GameDownloadQueue'
import { t } from 'i18next'

export class Game {
  constructor(
    public data: GameInfo // private downloadQueue: GameDownloadQueue
  ) {
    makeAutoObservable(this)
    window.api
      .isGameAvailable({
        appName: this.data.app_name,
        runner: this.data.runner
      })
      .then((available) => {
        this.isAvailable = available
      })
  }

  isHidden = false
  isFavourite = false
  isAvailable = true

  install() {
    if (this.isInstalled || this.isInstalling) {
      return
    }
  }

  get status() {
    return bridgeStore.gameStatusByAppName[this.appName]?.status
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

  get hasUpdate() {
    return (
      this.isInstalled &&
      bridgeStore.updatesAppNames?.includes(this.data.app_name)
    )
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
    if (!this.isPlaying) {
      return
    }
    sendKill(this.appName, this.data.runner)
  }

  get appName() {
    return this.data.app_name
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async play(launchArguments) {
    if (this.isPlaying || this.isUpdating) {
      return
    }

    const { autoSyncSaves, savesPath, gogSaves } =
      await window.api.requestGameSettings(this.appName)

    const doAutoSyncSaves = async () => {
      if (this.data.runner === 'legendary') {
        await syncSaves(savesPath, this.appName, this.data.runner)
      } else if (this.data.runner === 'gog' && gogSaves) {
        await window.api.syncGOGSaves(gogSaves, this.appName, '')
      }
    }

    if (autoSyncSaves) {
      await doAutoSyncSaves()
    }

    await launch({
      appName: this.appName,
      t,
      launchArguments,
      runner: this.data.runner,
      hasUpdate: this.hasUpdate,
      syncCloud: false, //manually sync before and after so we can update the buttons
      showDialogModal: () => {
        return
      }
    })

    if (autoSyncSaves) {
      await doAutoSyncSaves()
    }
  }

  update() {
    // this.changeStatus('updating')
  }

  cancelProgress() {}

  asRecent() {
    // this.isRecent = true
  }

  asNotRecent() {
    // this.isRecent = false
  }

  get downloadProgress() {
    return bridgeStore.gameStatusByAppName[this.data.app_name]
  }
}
