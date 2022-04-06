import { IpcRenderer, IpcRendererEvent } from 'electron'
import { useEffect, useRef, useState } from 'react'
import { InstallProgress, Runner } from '../types'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

export function useInstallProgress(
  appName: string,
  runner: Runner,
  sinceTimestamp: number
): InstallProgress {
  const [progress, setProgress] = useState<InstallProgress>(() => ({
    timestamp: 0,
    bytes: '0 MB',
    eta: Infinity,
    percent: 0
  }))
  const updateProgress = (newProgress: InstallProgress) => {
    if (
      newProgress &&
      newProgress.timestamp > progress.timestamp &&
      newProgress.timestamp > sinceTimestamp
    ) {
      setProgress(newProgress)
    }
  }
  const updateProgressRef = useRef(updateProgress)
  updateProgressRef.current = updateProgress

  useEffect(() => {
    ipcRenderer
      .invoke('requestGameProgress', appName, runner)
      .then((data) => updateProgressRef.current(data))

    const handler = (
      event: IpcRendererEvent,
      data: Record<string, InstallProgress>
    ) => {
      if (data[appName]) {
        updateProgressRef.current(data[appName])
      }
    }
    ipcRenderer.on('broadcastGameProgress', handler)
    return () => {
      ipcRenderer.off('broadcastGameProgress', handler)
    }
  }, [appName, runner])

  if (progress.timestamp > sinceTimestamp) {
    return progress
  } else {
    return {
      timestamp: 0,
      bytes: '0 MB',
      eta: Infinity,
      percent: 0
    }
  }
}
