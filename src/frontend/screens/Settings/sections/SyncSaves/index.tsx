import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../../SettingsContext'
import { defaultWineVersion } from '../..'
import GOGSyncSaves from './gog'
import LegendarySyncSaves from './legendary'

const SyncSaves = () => {
  const { t } = useTranslation()
  const { runner, gameInfo } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const [autoSyncSaves, setAutoSyncSaves] = useSetting('autoSyncSaves', false)
  const [savesPath, setSavesPath] = useSetting('savesPath', '')
  const [gogSavesLocations, setGogSavesLocations] = useSetting('gogSaves', [])

  const [defaultWinePrefix] = useSetting('defaultWinePrefix', '')
  const [winePrefix] = useSetting('winePrefix', defaultWinePrefix + '/default')

  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  const syncCommands = [
    { name: t('setting.manualsync.download'), value: '--skip-upload' },
    { name: t('setting.manualsync.upload'), value: '--skip-download' },
    { name: t('setting.manualsync.forcedownload'), value: '--force-download' },
    { name: t('setting.manualsync.forceupload'), value: '--force-upload' }
  ]

  if (runner === 'legendary') {
    return (
      <LegendarySyncSaves
        featureSupported={!!gameInfo?.cloud_save_enabled}
        savesPath={savesPath}
        setSavesPath={setSavesPath}
        autoSyncSaves={autoSyncSaves}
        setAutoSyncSaves={setAutoSyncSaves}
        isProton={!isWin && wineVersion.type === 'proton'}
        winePrefix={winePrefix}
        syncCommands={syncCommands}
      />
    )
  }

  if (runner === 'gog') {
    return (
      <GOGSyncSaves
        featureSupported={!!gameInfo?.cloud_save_enabled}
        isLinuxNative={gameInfo?.install.platform === 'linux'}
        gogSaves={gogSavesLocations}
        setGogSaves={setGogSavesLocations}
        autoSyncSaves={autoSyncSaves}
        setAutoSyncSaves={setAutoSyncSaves}
        syncCommands={syncCommands}
      />
    )
  }

  return <></>
}

export default SyncSaves
