import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import LegendarySyncSaves from './legendary'
import { useGameConfig } from 'frontend/hooks/config'

const SyncSaves = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const [autoSyncSaves, setAutoSyncSaves] = useGameConfig('autoSyncSaves')
  const [savePaths, setSavePaths, savePathsFetched] = useGameConfig('savePaths')

  const [winePrefix] = useGameConfig('winePrefix')

  const [wineVersion, , wineVersionFetched] = useGameConfig('wineVersion')

  const syncCommands = [
    { name: t('setting.manualsync.download'), value: '--skip-upload' },
    { name: t('setting.manualsync.upload'), value: '--skip-download' },
    { name: t('setting.manualsync.forcedownload'), value: '--force-download' },
    { name: t('setting.manualsync.forceupload'), value: '--force-upload' }
  ]

  if (!savePathsFetched || !wineVersionFetched) return <></>

  return (
    // TODO: Inline this now that we have one component for this again
    <LegendarySyncSaves
      savePaths={savePaths}
      setSavePaths={setSavePaths}
      autoSyncSaves={autoSyncSaves ?? false}
      setAutoSyncSaves={setAutoSyncSaves}
      isProton={!isWin && wineVersion.type === 'proton'}
      winePrefix={winePrefix}
      syncCommands={syncCommands}
    />
  )
}

export default SyncSaves
