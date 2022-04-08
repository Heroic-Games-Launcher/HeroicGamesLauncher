import { BrowserWindow } from 'electron'
import { InstallProgress } from './types'

const DECAY_MS = 10_000

export interface ProgressStatus {
  uuid: string
  action: 'install' | 'update' | 'import' | 'move' | 'repair' | 'uninstall'
  timestamp: number
  progress: number // 0 - 100 inclusive
  completedMegabytes: number
  completedParts: number
  totalParts: number
  runningSeconds?: number
  etaSeconds?: number
}

export interface ProgressStatusExtra extends ProgressStatus {
  speedPartsPerSecond: number
  speedMegabytesPerSecond: number
  computedEtaSeconds: number
}

export class ProgressService {
  private store = new Map<string, ProgressStatusExtra[]>()

  getProgressStatus(appName: string): ProgressStatusExtra[] {
    return this.store.get(appName) || []
  }

  clearProgressStatus(appName: string, action: ProgressStatus['action']) {
    const progressList = this.getProgressStatus(appName).filter(
      (p) => p.action !== action
    )
    this.store.set(appName, progressList)
    this.broadcastProgressStatus(appName)
  }

  reportProgressStatus(appName: string, progress: ProgressStatus): void {
    const progressList = this.getProgressStatus(appName).filter(
      (p) => p.action !== progress.action
    )
    progressList.unshift(this.getProgressStatusExtra(appName, progress))
    this.store.set(appName, progressList)
    this.broadcastProgressStatus(appName)
  }

  private getProgressStatusExtra(
    appName: string,
    progress: ProgressStatus
  ): ProgressStatusExtra {
    const previousProgress: ProgressStatusExtra | undefined =
      this.getProgressStatus(appName).find((p) => p.uuid === progress.uuid)
    let speedPartsPerSecond: number
    let speedMegabytesPerSecond: number
    let computedEtaSeconds: number
    if (!previousProgress) {
      speedPartsPerSecond = 0
      speedMegabytesPerSecond = 0
      computedEtaSeconds = Infinity
    } else {
      const timeDelta = progress.timestamp - previousProgress.timestamp
      if (timeDelta === 0 || progress.completedParts === 0) {
        speedPartsPerSecond = previousProgress.speedPartsPerSecond
        speedMegabytesPerSecond = previousProgress.speedMegabytesPerSecond
        computedEtaSeconds = previousProgress.computedEtaSeconds
      } else {
        const previousSpeed = previousProgress.speedPartsPerSecond
        const partsDelta =
          progress.completedParts - previousProgress.completedParts
        const speed = (1000 * partsDelta) / timeDelta
        const weight = Math.exp(-timeDelta / DECAY_MS)
        speedPartsPerSecond = previousSpeed * weight + speed * (1 - weight)
        speedMegabytesPerSecond =
          speedPartsPerSecond *
          (progress.completedMegabytes / progress.completedParts)
        computedEtaSeconds =
          speedPartsPerSecond !== 0
            ? Math.round(
                (progress.totalParts - progress.completedParts) /
                  speedPartsPerSecond
              )
            : Infinity
      }
    }

    return {
      ...progress,
      speedPartsPerSecond,
      speedMegabytesPerSecond,
      computedEtaSeconds
    }
  }

  getGameProgress(appName: string): InstallProgress {
    const progressList = progressService.getProgressStatus(appName)
    const sortedList = [...progressList].sort(
      (a, b) => a.timestamp - b.timestamp
    )
    const progressStatus = sortedList[0]
    if (progressStatus) {
      const eta = progressStatus.etaSeconds ?? progressStatus.computedEtaSeconds
      const percent = Math.round(progressStatus.progress * 10) / 10
      const bytes = `${
        Math.round(progressStatus.completedMegabytes * 100) / 100
      } MB`

      // logInfo(
      //   [`Progress for ${appName}:`, `${percent}/${bytes}/${eta}`.trim()],
      //   LogPrefix.Backend
      // )
      return {
        timestamp: progressStatus.timestamp,
        bytes,
        eta,
        percent
      }
    } else {
      return {
        timestamp: 0,
        bytes: '0 MB',
        eta: Infinity,
        percent: 0
      }
    }
  }

  private broadcastProgressStatus(appName: string): void {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('broadcastGameProgress', {
        [appName]: this.getGameProgress(appName)
      })
    }
  }
}

export const progressService = new ProgressService()
