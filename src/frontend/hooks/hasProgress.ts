import { useCallback, useEffect, useState } from 'react'
import { InstallProgress, Runner } from 'common/types'
import { useInstallProgress } from 'frontend/state/InstallProgress'

const storage: Storage = window.localStorage

export const hasProgress = (appName: string, runner: Runner) => {
  const [previousProgress] = useState<InstallProgress>(
    JSON.parse(
      storage.getItem(`${appName}_${runner}_progress`) || '{}'
    ) as InstallProgress
  )

  const [currentProgress, setProgress] = useState<InstallProgress>(
    previousProgress ?? {
      bytes: '0.00MB',
      eta: '00:00:00',
      percent: 0
    }
  )

  const calculatePercent = useCallback(
    (newProgress: InstallProgress) => {
      // current/100 * (100-heroic_stored) + heroic_stored
      if (newProgress.percent && previousProgress.percent) {
        const currentPercent = newProgress.percent
        const storedPercent = previousProgress.percent
        const newPercent: number = Math.round(
          (currentPercent / 100) * (100 - storedPercent) + storedPercent
        )
        return newPercent
      }
      return newProgress.percent
    },
    [previousProgress]
  )

  const installationProgress = useInstallProgress(
    (state) => state[`${appName}_${runner}`]
  )

  useEffect(() => {
    if (installationProgress) {
      if (currentProgress.percent !== installationProgress.percent)
        setProgress({
          ...installationProgress,
          percent: calculatePercent(installationProgress)
        })
    }
  }, [
    installationProgress,
    appName,
    runner,
    calculatePercent,
    currentProgress.percent
  ])

  return [currentProgress, previousProgress]
}
