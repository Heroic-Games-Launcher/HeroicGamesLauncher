import { GameStatus, InstallProgress } from 'common/types'
import { useEffect, useState } from 'react'

export const hasProgress = (appName: string, gameStatus: GameStatus) => {
  const [progress, setProgress] = useState<InstallProgress | undefined>(
    gameStatus.progress
  )

  useEffect(() => {
    const removeListener = window.api.handleProgressUpdate(
      appName,
      (_e, status) => {
        setProgress(status.progress)
      }
    )

    return () => removeListener()
  }, [])

  useEffect(() => {
    if (gameStatus.status === 'done') {
      setProgress(undefined)
    }
  }, [gameStatus])

  return progress
}
