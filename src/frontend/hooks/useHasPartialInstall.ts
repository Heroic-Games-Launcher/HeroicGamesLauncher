import { useState, useEffect } from 'react'
import {
  clearPartialInstall,
  getPartialInstallFolder
} from 'frontend/helpers/library'

export function useHasPartialInstall(
  appName: string,
  isInstalled: boolean
): { hasPartialInstall: boolean; partialInstallFolder: string | undefined } {
  const read = () => (isInstalled ? undefined : getPartialInstallFolder(appName))

  const [partialInstallFolder, setPartialInstallFolder] = useState<
    string | undefined
  >(read)

  useEffect(() => {
    // Once a game is fully installed, drop any stale partial-install marker left
    // over from the download so it doesn't linger in localStorage.
    if (isInstalled && getPartialInstallFolder(appName)) {
      clearPartialInstall(appName)
    }

    setPartialInstallFolder(read())

    const handleStorage = (e: StorageEvent) => {
      if (e.key === appName) {
        setPartialInstallFolder(read())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appName, isInstalled])

  return {
    hasPartialInstall: !!partialInstallFolder,
    partialInstallFolder
  }
}
