import { useState, useEffect } from 'react'

const storage: Storage = window.localStorage

export function hasPartialInstall(
  appName: string,
  isInstalled: boolean
): { hasPartialInstall: boolean; partialInstallFolder: string | undefined } {
  const getFolder = () => {
    if (isInstalled) return undefined
    const data = JSON.parse(storage.getItem(appName) || '{}') as {
      folder?: string
    }
    return data.folder
  }

  const [partialInstallFolder, setPartialInstallFolder] = useState<
    string | undefined
  >(getFolder)

  useEffect(() => {
    setPartialInstallFolder(getFolder())
  }, [appName, isInstalled])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === appName) {
        setPartialInstallFolder(getFolder())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [appName, isInstalled])

  return {
    hasPartialInstall: !!partialInstallFolder,
    partialInstallFolder
  }
}
