import { GameStatus } from 'common/types'
import React, { useContext, useEffect, useState } from 'react'
import ContextProvider from './ContextProvider'
import { LibraryProvider } from './LibraryContext'

interface Props {
  children: React.ReactNode
}

export function LibraryState({ children }: Props) {
  const [gameStatusList, setGameStatusList] = useState(
    new Map<string, GameStatus>()
  )
  const { refreshLibrary } = useContext(ContextProvider)

  useEffect(() => {
    window.api
      .getAllGameStatus()
      .then((gameStatusList) => setGameStatusList(gameStatusList))

    const onGameStatusUpdate = async (
      _e: Electron.IpcRendererEvent,
      newGameStatus: GameStatus
    ) => {
      gameStatusList.set(newGameStatus.appName, newGameStatus)
      setGameStatusList(gameStatusList)

      if (newGameStatus.status === 'done') {
        refreshLibrary({
          checkForUpdates: false,
          fullRefresh: true,
          runInBackground: true,
          library: newGameStatus.runner || 'all'
        })
      }
    }

    const setGameStatusRemoveListener =
      window.api.handleGameStatus(onGameStatusUpdate)

    return () => {
      setGameStatusRemoveListener()
    }
  }, [])

  function hasGameStatus(appName: string): GameStatus {
    return (
      gameStatusList.get(appName) ?? {
        appName,
        status: 'done',
        folder: 'default',
        runner: 'legendary',
        progress: {
          bytes: '0.00MiB',
          eta: '00:00:00',
          percent: 0,
          folder: 'default'
        },
        previousProgress: {
          bytes: '0.00MiB',
          eta: '00:00:00',
          percent: 0,
          folder: 'default'
        }
      }
    )
  }

  function hasDownloads(): boolean {
    return [...gameStatusList.values()].some(
      (gameStatus: GameStatus) =>
        gameStatus.status === 'installing' || gameStatus.status === 'updating'
    )
  }

  return (
    <LibraryProvider value={{ gameStatusList, hasGameStatus, hasDownloads }}>
      {children}
    </LibraryProvider>
  )
}
