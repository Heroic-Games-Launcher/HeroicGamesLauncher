import { IpcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { GameStatus, InstallProgress } from 'src/types'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

const storage: Storage = window.localStorage

export const hasProgress = (appName: string) => {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress

  const [progress, setProgress] = useState(
    previousProgress ??
      ({
        bytes: '0.00MiB',
        eta: '00:00:00',
        percent: 0
      } as InstallProgress)
  )

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

  useEffect(() => {
    const onGameStatusUpdate = async (
      _e: Electron.IpcRendererEvent,
      { appName: appWithProgress, progress: currentProgress }: GameStatus
    ) => {
      if (appName === appWithProgress && currentProgress) {
        setProgress({
          ...currentProgress,
          percent: calculatePercent(currentProgress)
        })
      }
    }
    ipcRenderer.on('setGameStatus', onGameStatusUpdate)

    return () => {
      ipcRenderer.removeListener('setGameStatus', onGameStatusUpdate)
    }
  }, [])

  return [progress, previousProgress]
}
