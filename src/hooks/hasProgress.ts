import { IpcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { GameStatus, InstallProgress } from 'src/types'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

const storage: Storage = window.localStorage

export const hasProgress = (appName: string) => {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress

  const [progress, setProgress] = useState(
    previousProgress ??
      ({
        bytes: '0.00MiB',
        eta: '00:00:00',
        percent: 0
      } as InstallProgress)
  )

  useEffect(() => {
    const onGameStatusUpdate = async (
      _e: Electron.IpcRendererEvent,
      { appName: appWithProgress, progress }: GameStatus
    ) => {
      if (appName === appWithProgress && progress) {
        setProgress(progress)
      }
    }
    ipcRenderer.on('setGameStatus', onGameStatusUpdate)

    return () => {
      ipcRenderer.removeListener('setGameStatus', onGameStatusUpdate)
    }
  }, [])

  return [progress, previousProgress]
}
