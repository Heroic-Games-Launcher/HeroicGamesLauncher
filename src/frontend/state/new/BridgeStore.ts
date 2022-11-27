import { GameStatus, RecentGame } from 'common/types'
import { InstallProgress } from 'frontend/types'
import { makeAutoObservable } from 'mobx'
import { configStore } from '../../helpers/electronStores'

// bridge: reactive updates from electron
export class BridgeStore {
  installProgressByAppName: { [key: string]: InstallProgress } = {}
  recentAppNames: string[] = []
  updatesAppNames: string[] = []

  constructor() {
    makeAutoObservable(this)
    window.api.handleSetGameStatus(this.onHandleSetGameStatus.bind(this))
    window.api.handleRecentGamesChanged(async () =>
      this.loadRecentGamesAppNames()
    )
    this.updatesAppNames = JSON.parse(localStorage.getItem('updates') || '[]')
  }

  private onHandleSetGameStatus(
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

  loadRecentGamesAppNames() {
    this.recentAppNames = [
      ...new Set(
        ...(configStore.get('games.recent', []) as Array<RecentGame>).map(
          (recent) => recent.appName
        )
      )
    ]
  }
}
