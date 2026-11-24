import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Runner, SaveBackupEntry } from 'common/types'
import { Alert, Button, SettingRow } from 'frontend/components/UI'
import { parseBackupDate, toIntlLocale } from 'common/utils'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../../SettingsContext'
import './backups.css'

interface Props {
  runner: Runner
}

const formatBackupDate = (value: string, locale: string) => {
  const parsed = parseBackupDate(value)
  if (!parsed) {
    return value
  }

  try {
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed)
  } catch {
    return parsed.toLocaleString()
  }
}

const Backups = ({ runner }: Props) => {
  const { t, i18n } = useTranslation()
  const { appName } = useContext(SettingsContext)
  const { showDialogModal } = useContext(ContextProvider)
  const [backups, setBackups] = useState<SaveBackupEntry[]>([])

  const refresh = () => {
    void window.api
      .getSaveBackups(appName, runner)
      .then(setBackups)
      .catch((error) =>
        window.api.logError(`Could not load save backups: ${error}`)
      )
  }

  const openFolder = () => {
    void window.api
      .getSaveBackupPath(appName)
      .then((path) => window.api.openFolder(path))
      .catch((error) =>
        window.api.logError(`Could not open the backups folder: ${error}`)
      )
  }

  useEffect(() => {
    refresh()
    window.addEventListener('cloud-saves-synced', refresh)
    return () => window.removeEventListener('cloud-saves-synced', refresh)
  }, [appName, runner])

  const restoreErrorMessage = (code?: string) => {
    switch (code) {
      case 'backup-incomplete':
        return t(
          'setting.backups-error-incomplete',
          'This backup is incomplete and cannot be restored'
        )
      case 'backup-removed':
        return t(
          'setting.backups-error-removed',
          'This backup was removed by the size limit'
        )
      case 'backup-failed':
        return t(
          'setting.backups-error-failed',
          'Could not create a safety backup before restoring'
        )
      case 'location-changed':
        return t(
          'setting.backups-error-location',
          'The save location changed since this backup was taken'
        )
      default:
        return code ?? ''
    }
  }

  const restore = (backup: SaveBackupEntry) => {
    showDialogModal({
      title: t('setting.backups-restore', 'Restore save backup'),
      message: t(
        'setting.backups-restore-confirm',
        'Restore the save files from {{date}}?',
        { date: formatBackupDate(backup.createdAt, i18n.language) }
      ),
      buttons: [
        {
          text: t('box.yes'),
          onClick: () => {
            void window.api
              .restoreSaveBackup(appName, runner, backup.id)
              .then((result) => {
                if (result.status === 'done') {
                  if (result.alreadyCurrent) {
                    window.api.notify({
                      title: t(
                        'setting.backups-already-current-title',
                        'Saves already up to date'
                      ),
                      body: t(
                        'setting.backups-already-current-body',
                        'This backup matches your current saves'
                      )
                    })
                  } else {
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
                  }
                } else {
                  window.api.notify({
                    title: t(
                      'setting.backups-restore-failed',
                      'Could not restore the backup'
                    ),
                    body: restoreErrorMessage(result.error)
                  })
                }
                refresh()
              })
              .catch((error) =>
                window.api.logError(`Could not restore the backup: ${error}`)
              )
          }
        },
        { text: t('box.no'), onClick: () => null }
      ]
    })
  }

  const locationName = (location: string) =>
    location.split(/[\\/]/).filter(Boolean).pop()

  return (
    <div>
      <h4>{t('setting.backups', 'Save backups')}</h4>
      {backups.length === 0 ? (
        <Alert variant="info">
          {t('setting.backups-empty', 'No save backups yet')}
        </Alert>
      ) : (
        <div className="savesBackups__list">
          {backups.map((backup) => (
            <SettingRow
              key={backup.id}
              label={formatBackupDate(backup.createdAt, i18n.language)}
              description={`${t(
                'setting.backups-summary',
                '{{changed}} changed, {{deleted}} deleted',
                { changed: backup.changed, deleted: backup.deleted }
              )}${locationName(backup.location) ? ` · ${locationName(backup.location)}` : ''}${
                backup.isCurrent
                  ? ` — ${t('setting.backups-current', 'Matches your current saves')}`
                  : ''
              }`}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={backup.isCurrent}
                onClick={() => restore(backup)}
              >
                {t('setting.backups-restore-button', 'Restore')}
              </Button>
            </SettingRow>
          ))}
        </div>
      )}
      <div className="savesBackups__actions">
        <Button variant="ghost" size="sm" onClick={openFolder}>
          {t('setting.backups-open-folder', 'Open backups folder')}
        </Button>
      </div>
    </div>
  )
}

export default Backups
