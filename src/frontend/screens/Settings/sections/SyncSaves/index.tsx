import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../../SettingsContext'
import { defaultWineVersion } from '../../util'
import GOGSyncSaves from './gog'
import LegendarySyncSaves from './legendary'
import SteamSyncSaves from './steam'
import Backups from './backups'
import { ToggleSwitch } from 'frontend/components/UI'
import { getSavePathFingerprint } from 'common/utils'

const SyncSaves = () => {
  const { t } = useTranslation()
  const { appName, runner, gameInfo } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const [autoSyncSaves, setAutoSyncSaves] = useSetting('autoSyncSaves', false)
  const [savesPath, setSavesPath] = useSetting('savesPath', '')
  const [gogSavesLocations, setGogSavesLocations] = useSetting('gogSaves', [])
  const [enableQuickSavesMenu, setEnableQuickSavesMenu] = useSetting(
    'enableQuickSavesMenu',
    false
  )

  const [sharedWinePrefix] = useSetting('sharedWinePrefix', '')
  const [winePrefix] = useSetting('winePrefix', sharedWinePrefix)

  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [savesPathFingerprint, setSavesPathFingerprint] = useSetting(
    'savesPathFingerprint',
    ''
  )

  const savePathFingerprint = gameInfo
    ? getSavePathFingerprint(gameInfo, { winePrefix, wineVersion })
    : ''

  const syncCommands = [
    { name: t('setting.manualsync.download'), value: '--skip-upload' },
    { name: t('setting.manualsync.upload'), value: '--skip-download' },
    { name: t('setting.manualsync.forcedownload'), value: '--force-download' },
    { name: t('setting.manualsync.forceupload'), value: '--force-upload' }
  ]

  const QuickSavesToggle = () => {
    return (
      <ToggleSwitch
        htmlId="enableQuickSavesMenu"
        value={enableQuickSavesMenu}
        handleChange={() => setEnableQuickSavesMenu(!enableQuickSavesMenu)}
        title={t(
          'setting.enable-quick-sync-menu',
          'Enable quick save-sync menu on game page'
        )}
      />
    )
  }

  if (runner === 'legendary') {
    return (
      <>
        <LegendarySyncSaves
          featureSupported={!!gameInfo?.cloud_save_enabled}
          savesPath={savesPath}
          setSavesPath={setSavesPath}
          autoSyncSaves={autoSyncSaves}
          setAutoSyncSaves={setAutoSyncSaves}
          isProton={!isWin && wineVersion.type === 'proton'}
          winePrefix={winePrefix}
          savePathFingerprint={savePathFingerprint}
          savesPathFingerprint={savesPathFingerprint}
          setSavesPathFingerprint={setSavesPathFingerprint}
          syncCommands={syncCommands}
          quickSavesToggle={QuickSavesToggle}
        />
        <Backups runner="legendary" />
      </>
    )
  }

  if (runner === 'steam') {
    return <SteamSyncSaves appName={appName} />
  }

  if (runner === 'gog') {
    return (
      <>
        <GOGSyncSaves
          featureSupported={!!gameInfo?.cloud_save_enabled}
          isLinuxNative={gameInfo?.install.platform === 'linux'}
          gogSaves={gogSavesLocations}
          setGogSaves={setGogSavesLocations}
          savePathFingerprint={savePathFingerprint}
          savesPathFingerprint={savesPathFingerprint}
          setSavesPathFingerprint={setSavesPathFingerprint}
          autoSyncSaves={autoSyncSaves}
          setAutoSyncSaves={setAutoSyncSaves}
          syncCommands={syncCommands}
          quickSavesToggle={QuickSavesToggle}
        />
        <Backups runner="gog" />
      </>
    )
  }

  return <></>
}

export default SyncSaves
