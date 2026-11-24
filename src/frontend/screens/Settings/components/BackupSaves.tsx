import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, ToggleSwitch } from 'frontend/components/UI'
import { MenuItem } from '@mui/material'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const BackupSaves = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [backupSaves, setBackupSaves] = useSetting('backupSaves', true)
  const [maxSaveBackupSize, setMaxSaveBackupSize] = useSetting(
    'maxSaveBackupSize',
    1
  )

  if (!isDefault) {
    return <></>
  }

  return (
    <>
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
      {backupSaves && (
        <SelectField
          label={t('setting.maxSaveBackupSize', 'Backup size limit')}
          htmlId="setMaxSaveBackupSize"
          extraClass="smaller"
          onChange={(event) => setMaxSaveBackupSize(Number(event.target.value))}
          value={maxSaveBackupSize.toString()}
        >
          {[1, 2, 5, 10].map((size) => (
            <MenuItem key={size} value={size}>
              {t('setting.backupSize', '{{size}} GB', { size })}
            </MenuItem>
          ))}
        </SelectField>
      )}
    </>
  )
}

export default BackupSaves
