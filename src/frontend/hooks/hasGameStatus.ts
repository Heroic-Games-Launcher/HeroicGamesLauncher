import { useEffect, useState } from 'react'
import { GameStatus } from 'common/types'

export const hasGameStatus = (appName: string) => {
  const defaultGameStatus: GameStatus = {
    appName,
    status: 'done',
    folder: 'default',
    runner: 'legendary',
    progress: {
      bytes: '0.00MiB',
      eta: '00:00:00',
      percent: 0,
      folder: 'default'
    }
  }

  let previousGameStatus: GameStatus = defaultGameStatus

  window.api.getGameStatus(appName).then((gameStatus: GameStatus) => {
    if (gameStatus) {
      previousGameStatus = { ...previousGameStatus, ...gameStatus }
    }
  })

  const [gameStatus, setGameStatus] = useState<GameStatus>(
    previousGameStatus ?? defaultGameStatus
  )

  const calculatePercent = (gameStatus: GameStatus) => {
    // current/100 * (100-heroic_stored) + heroic_stored
    if (previousGameStatus.progress?.percent) {
      const currentPercent = gameStatus.progress?.percent
      const storedPercent = previousGameStatus.progress.percent
      if (currentPercent !== undefined) {
        const newPercent: number = Math.round(
          (currentPercent / 100) * (100 - storedPercent) + storedPercent
        )
        if (gameStatus.progress) {
          gameStatus.progress.percent = newPercent
        }
      }
    }
    return gameStatus
  }

  useEffect(() => {
    const onGameStatusUpdate = async (
      _e: Electron.IpcRendererEvent,
      gameStatus: GameStatus
    ) => {
      if (gameStatus && appName === gameStatus.appName) {
        setGameStatus({
          ...gameStatus,
          ...calculatePercent(gameStatus)
        })
      }
    }
    const setGameStatusRemoveListener =
      window.api.handleGameStatus(onGameStatusUpdate)

    return () => {
      setGameStatusRemoveListener()
    }
  }, [])

  return [gameStatus, previousGameStatus]
}
