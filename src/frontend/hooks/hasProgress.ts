import { useCallback, useEffect, useMemo, useState } from 'react'
import { InstallProgress } from 'common/types'
import { useInstallProgress } from 'frontend/state/InstallProgress'
import type { GameHandle } from '../helpers/ipc'

const storage: Storage = window.localStorage

export const hasProgress = (
  game: GameHandle | null
): [InstallProgress, InstallProgress | null] => {
  const previousProgress = useMemo(() => {
    if (!game) return null
    return JSON.parse(
      storage.getItem(`${game.id}_${game.runner}_progress`) || '{}'
    ) as InstallProgress
  }, [game])

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
      if (newProgress.percent && previousProgress?.percent) {
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

  const installationProgress = useInstallProgress((state) =>
    game ? state[`${game.id}_${game.runner}`] : null
  )

  useEffect(() => {
    if (installationProgress) {
      if (currentProgress.percent !== installationProgress.percent)
        setProgress({
          ...installationProgress,
          percent: calculatePercent(installationProgress)
        })
    }
  }, [installationProgress, game, calculatePercent, currentProgress.percent])

  return [currentProgress, previousProgress]
}
