import { useEffect, useState } from 'react'
import { GameStatus, InstallProgress } from 'common/types'

const storage: Storage = window.localStorage

export const hasProgress = (appName: string) => {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress

  const [progress, setProgress] = useState(
    previousProgress ??
      ({
        bytes: '0.00MB',
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
    const handleProgressUpdate = async (
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
    const setGameStatusRemoveListener = window.api.onProgressUpdate(
      appName,
      handleProgressUpdate
    )

    return () => {
      setGameStatusRemoveListener()
    }
  }, [appName])

  return [progress, previousProgress]
}
