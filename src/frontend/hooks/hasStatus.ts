import { useContext, useEffect, useState } from 'react'
import { GameStatus } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'

export const hasStatus = (appName: string) => {
  const { libraryStatus, handleGameStatus } = useContext(ContextProvider)
  const [status, setStatus] = useState('done')

  useEffect(() => {
    setStatus(
      libraryStatus.find((game) => game.appName === appName)?.status || 'done'
    )

    const onGameStatusUpdate = async (
      _e: Electron.IpcRendererEvent,
      { appName: appWithProgress, status }: GameStatus
    ) => {
      if (appName === appWithProgress && status) {
        handleGameStatus({
          appName,
          status
        })
        setStatus(status)
      }
    }
    const setGameStatusRemoveListener =
      window.api.handleSetGameStatus(onGameStatusUpdate)

    return () => {
      setGameStatusRemoveListener()
    }
  }, [appName])

  return [status]
}
