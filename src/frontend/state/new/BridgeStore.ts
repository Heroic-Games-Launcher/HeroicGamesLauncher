import { GameStatus } from 'common/types'
import { InstallProgress } from 'frontend/types'
import { makeAutoObservable } from 'mobx'

export class BridgeStore {
  installProgressByAppName: { [key: string]: InstallProgress } = {}

  constructor() {
    makeAutoObservable(this)
    window.api.handleSetGameStatus(this.onHandleSetGameStatus.bind(this))
  }

  onHandleSetGameStatus(
    _e: Electron.IpcRendererEvent,
    { appName, progress: currentProgress }: GameStatus
  ) {
    const previousProgress = this.installProgressByAppName[appName]
    const calculatePercent = (currentProgress: InstallProgress) => {
      // current/100 * (100-heroic_stored) + heroic_stored
      if (previousProgress.percent) {
        const currentPercent = currentProgress.percent
        const storedPercent = previousProgress.percent
        const newPercent: number = Math.round(
          (currentPercent / 100) * (100 - storedPercent) + storedPercent
        )
        return newPercent
      }
      return currentProgress.percent
    }

    this.installProgressByAppName[appName] = {
      ...currentProgress,
      percent: calculatePercent(currentProgress!)
    } as InstallProgress
  }
}
