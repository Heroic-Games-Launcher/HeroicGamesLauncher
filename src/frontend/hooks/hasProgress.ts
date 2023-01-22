import { useEffect, useState } from 'react'
import { GameStatus, InstallProgress } from 'common/types'

const storage: Storage = window.localStorage

export const hasProgress = (appName: string) => {
  const previousProgressItem = storage.getItem(appName)
  const previousProgress = previousProgressItem
    ? (JSON.parse(previousProgressItem) as InstallProgress)
    : null

  const [progress, setProgress] = useState<InstallProgress>(
    previousProgress ?? {
      bytes: '0.00MB',
      eta: '00:00:00',
      percent: 0
    }
  )

  const handleProgressUpdate = async (
    _e: Electron.IpcRendererEvent,
    { appName: appWithProgress, progress: currentProgress }: GameStatus
  ) => {
    if (appName === appWithProgress && currentProgress) {
      console.log(
        'Current progress:\n',
        progress,
        '\nNew progress:\n',
        currentProgress
      )
      setProgress({ ...progress, ...currentProgress })
    }
  }

  useEffect(() => {
    const setGameStatusRemoveListener = window.api.onProgressUpdate(
      appName,
      handleProgressUpdate
    )

    return () => {
      setGameStatusRemoveListener()
    }
  }, [appName])

  return [progress, previousProgress] as const
}
