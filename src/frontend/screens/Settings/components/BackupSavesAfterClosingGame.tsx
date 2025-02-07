import React, { useContext } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { InfoBox, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const BackupSavesAfterClosingGame = () => {
  const { t, i18n } = useTranslation()
  const { appName } = useContext(SettingsContext)

  const [backupSavesAfterClosingGame, setBackupSavesAfterClosingGame] =
    useSetting('backupSavesAfterClosingGame', false)
  const [autoSyncSaves] = useSetting('autoSyncSaves', false)

  if (!autoSyncSaves) {
    return <></>
  }

  return (
    <div>
      <ToggleSwitch
        htmlId="backupSavesAfterClosingGame"
        value={backupSavesAfterClosingGame}
        handleChange={() =>
          setBackupSavesAfterClosingGame(!backupSavesAfterClosingGame)
        }
        title={t(
          'setting.backupSavesAfterClosingGame',
          "Backup saves in Heroic's config after closing a game."
        )}
      />

      <InfoBox text={t('infobox.backupSaves.title', 'About Heroic backups')}>
        <Trans i18n={i18n} key="infobox.backupSaves.details">
          Backups are stored in Heroic&apos;s config folder, in `savesBackups/
          {appName}`.
          <br />
          <br />
          To restore a backup, you must do it manually. This is intended as a
          safety measure and not as a full backup system.
          <br />
          <br />
          You may want to delete old backups periodically to free up space.
        </Trans>
      </InfoBox>
    </div>
  )
}

export default BackupSavesAfterClosingGame
