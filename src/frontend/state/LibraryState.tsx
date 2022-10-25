import { GameStatus, GameStatusMap } from 'common/types'
import React, { useContext, useEffect, useState } from 'react'
import ContextProvider from './ContextProvider'
import { LibraryProvider } from './LibraryContext'

interface Props {
  children: React.ReactNode
}

export function LibraryState({ children }: Props) {
  const [gameStatusMap, setGameStatusMap] = useState<GameStatusMap>({})
  const { refreshLibrary } = useContext(ContextProvider)

  useEffect(() => {
    window.api
      .getAllGameStatus()
      .then((gameStatusMap) => setGameStatusMap(gameStatusMap))

    const onGameStatusUpdate = async (
      _e: Electron.IpcRendererEvent,
      newGameStatus: GameStatus
    ) => {
      console.log({ newGameStatus })
      gameStatusMap[newGameStatus.appName] = newGameStatus
      setGameStatusMap(gameStatusMap)

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
      gameStatusMap[appName] ?? {
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
    return [...Object.values(gameStatusMap)].some((gameStatus) =>
      ['updating', 'installing'].includes(gameStatus.status)
    )
  }

  return (
    <LibraryProvider value={{ gameStatusMap, hasGameStatus, hasDownloads }}>
      {children}
    </LibraryProvider>
  )
}
