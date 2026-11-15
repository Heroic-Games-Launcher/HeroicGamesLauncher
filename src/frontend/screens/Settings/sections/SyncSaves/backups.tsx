import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Runner, SaveBackupEntry } from 'common/types'
import { Button, SettingRow } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../../SettingsContext'

interface Props {
  runner: Runner
}

const formatBackupDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

const Backups = ({ runner }: Props) => {
  const { t } = useTranslation()
  const { appName } = useContext(SettingsContext)
  const { showDialogModal } = useContext(ContextProvider)
  const [backups, setBackups] = useState<SaveBackupEntry[]>([])

  const refresh = () => {
    void window.api.getSaveBackups(appName, runner).then(setBackups)
  }

  const openFolder = () => {
    void window.api
      .getSaveBackupPath(appName)
      .then((path) => window.api.openFolder(path))
  }

  useEffect(refresh, [appName, runner])

  if (!backups.length) {
    return <></>
  }

  const restore = (backup: SaveBackupEntry) => {
    showDialogModal({
      title: t('setting.backups-restore', 'Restore save backup'),
      message: t(
        'setting.backups-restore-confirm',
        'Restore the save files from {{date}}?',
        { date: formatBackupDate(backup.createdAt) }
      ),
      buttons: [
        {
          text: t('box.yes'),
          onClick: () => {
            void window.api
              .restoreSaveBackup(appName, runner, backup.id)
              .then((result) => {
                if (result.status === 'done') {
                  window.api.notify({
                    title: t(
                      'setting.backups-restored-title',
                      'Saves restored'
                    ),
                    body: t(
                      'setting.backups-restored-body',
                      'The save files were restored from the selected backup'
                    )
                  })
                } else {
                  window.api.notify({
                    title: t(
                      'setting.backups-restore-failed',
                      'Could not restore the backup'
                    ),
                    body: result.error ?? ''
                  })
                }
                refresh()
              })
          }
        },
        { text: t('box.no'), onClick: () => null }
      ]
    })
  }

  return (
    <div>
      <h4>{t('setting.backups', 'Save backups')}</h4>
      {backups.map((backup) => (
        <SettingRow
          key={backup.id}
          label={formatBackupDate(backup.createdAt)}
          description={t(
            'setting.backups-summary',
            '{{changed}} changed files, {{deleted}} deleted files',
            { changed: backup.changed, deleted: backup.deleted }
          )}
        >
          <Button variant="secondary" size="sm" onClick={() => restore(backup)}>
            {t('setting.backups-restore-button', 'Restore')}
          </Button>
        </SettingRow>
      ))}
      <Button variant="ghost" size="sm" onClick={openFolder}>
        {t('setting.backups-open-folder', 'Open backups folder')}
      </Button>
    </div>
  )
}

export default Backups
