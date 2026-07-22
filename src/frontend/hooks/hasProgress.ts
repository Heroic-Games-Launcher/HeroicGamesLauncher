import { useEffect, useState } from 'react'
import { InstallProgress, Runner } from 'common/types'
import { useInstallProgress } from 'frontend/state/InstallProgress'

export const hasProgress = (appName: string, runner: Runner) => {
  const [currentProgress, setProgress] = useState<InstallProgress>({
    bytes: '0.00MB',
    eta: '00:00:00',
    percent: 0
  })

  const installationProgress = useInstallProgress(
    (state) => state[`${appName}_${runner}`]
  )

  useEffect(() => {
    if (installationProgress) {
      if (currentProgress.percent !== installationProgress.percent)
        setProgress(installationProgress)
    }
  }, [installationProgress, appName, runner, currentProgress.percent])

  return [currentProgress]
}
