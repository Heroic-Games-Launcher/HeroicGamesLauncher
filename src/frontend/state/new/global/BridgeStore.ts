import { GameStatus, RecentGame } from 'common/types'
import { InstallProgress } from 'frontend/types'
import { makeAutoObservable } from 'mobx'
import { configStore } from '../../../helpers/electronStores'

// bridge: reactive updates from electron/local storage
export class BridgeStore {
  gameStatusByAppName: { [key: string]: GameStatus } = {}
  recentAppNames: string[] = []
  updatedAppNames: string[] = []

  constructor() {
    makeAutoObservable(this)
    window.api.handleSetGameStatus(this.onHandleSetGameStatus.bind(this))
    window.api.handleRecentGamesChanged(async () =>
      this.loadRecentGamesAppNames()
    )
    this.loadRecentGamesAppNames()
    // this.updatedAppNames = JSON.parse(localStorage.getItem('updates') || '[]')
  }

  private onHandleSetGameStatus(
    _e: Electron.IpcRendererEvent,
    gameStatus: GameStatus
  ) {
    const { appName, progress: currentProgress, status } = gameStatus
    const calculatePercent = (currentProgress: InstallProgress) => {
      const previousProgress = this.gameStatusByAppName[appName]?.progress
      // current/100 * (100-heroic_stored) + heroic_stored
      if (previousProgress?.percent) {
        const currentPercent = currentProgress.percent
        const storedPercent = previousProgress?.percent || 0
        const newPercent: number = Math.round(
          (currentPercent / 100) * (100 - storedPercent) + storedPercent
        )
        return newPercent
      }
      return currentProgress.percent
    }

    console.log('Game status changed', gameStatus)

    this.gameStatusByAppName[appName] = {
      status: status,
      appName
    }

    if (currentProgress) {
      this.gameStatusByAppName[appName].progress = {
        ...currentProgress,
        percent: calculatePercent(currentProgress!)
      } as InstallProgress
    }
  }

  loadRecentGamesAppNames() {
    this.recentAppNames = (
      configStore.get('games.recent', []) as Array<RecentGame>
    ).map((recent) => recent.appName)
  }

  async loadUpdatedGamesAppNames() {
    try {
      this.updatedAppNames = await window.api.checkGameUpdates()
    } catch (error) {
      window.api.logError(`${error}`)
    }
  }
}
