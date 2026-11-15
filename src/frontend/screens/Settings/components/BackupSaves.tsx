import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const BackupSaves = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [backupSaves, setBackupSaves] = useSetting('backupSaves', true)

  if (!isDefault) {
    return <></>
  }

  return (
    <ToggleSwitch
      info={t(
        'help.backupSaves',
        'Backups are incremental and stored in the Saves_Backup folder inside your default install path'
      )}
      description={t(
        'setting.backupSaves-description',
        'Store a backup of changed save files on every sync'
      )}
      htmlId="backupSaves"
      value={backupSaves}
      handleChange={() => setBackupSaves(!backupSaves)}
      title={t('setting.backupSaves', 'Back up saves on every sync')}
    />
  )
}

export default BackupSaves
