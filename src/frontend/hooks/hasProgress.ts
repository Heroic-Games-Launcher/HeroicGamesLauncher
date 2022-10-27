import { InstallProgress } from 'common/types'
import { useEffect, useState } from 'react'

export const hasProgress = (
  appName: string,
  initialProgress: InstallProgress | undefined
) => {
  const [progress, setProgress] = useState<InstallProgress | undefined>(
    initialProgress
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

  return progress
}
