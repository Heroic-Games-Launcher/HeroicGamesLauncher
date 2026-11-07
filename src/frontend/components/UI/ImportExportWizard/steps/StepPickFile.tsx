import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'

import SvgButton from 'frontend/components/UI/SvgButton'

import type { HeroicBackupDiscoveryResult } from 'common/types/importExport'

interface Props {
  filePath: string
  onPick: (path: string) => void
  validating: boolean
  error: string | null
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function StepPickFile({
  filePath,
  onPick,
  validating,
  error
}: Props) {
  const { t } = useTranslation()
  const [discovery, setDiscovery] =
    useState<HeroicBackupDiscoveryResult | null>(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    let cancelled = false
    setScanning(true)
    window.api
      .listHeroicBackups()
      .then((result) => {
        if (!cancelled) setDiscovery(result)
      })
      .catch(() => {
        if (!cancelled) setDiscovery(null)
      })
      .finally(() => {
        if (!cancelled) setScanning(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function chooseFile() {
    const selected = await window.api.openDialog({
      title: t('import-export.pick-backup', 'Choose a Heroic backup archive'),
      properties: ['openFile'],
      filters: [{ name: 'Heroic backup', extensions: ['zip'] }]
    })
    if (typeof selected === 'string') {
      onPick(selected)
    }
  }

  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step1.title', 'Select a backup file to import')}
      </h3>
      <p className="ImportExportWizard__hint">
        {t(
          'import-export.step1.hint',
          'Pick a Heroic backup archive (.zip) previously exported from Heroic. Backups in your default folder are listed below.'
        )}
      </p>

      {!scanning && discovery && (
        <div className="ImportExportWizard__discovered">
          <div className="ImportExportWizard__discoveredHeader">
            <span>
              {t('import-export.step1.found', 'Backups found in {{folder}}', {
                folder: discovery.directory
              })}
            </span>
          </div>
          {discovery.backups.length > 0 ? (
            <ul className="ImportExportWizard__backupList">
              {discovery.backups.map((backup) => (
                <li key={backup.path}>
                  <button
                    type="button"
                    className={classNames('ImportExportWizard__backupRow', {
                      'is-selected': backup.path === filePath
                    })}
                    onClick={() => onPick(backup.path)}
                    disabled={validating}
                    title={backup.path}
                  >
                    <InsertDriveFileIcon fontSize="small" />
                    <span className="ImportExportWizard__backupMeta">
                      <span className="ImportExportWizard__backupName">
                        {backup.fileName}
                      </span>
                      <span className="ImportExportWizard__backupSub">
                        {new Date(backup.modifiedAt).toLocaleString()} ·{' '}
                        {formatSize(backup.size)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ImportExportWizard__hint">
              {t(
                'import-export.step1.none',
                'No Heroic backups found in this folder. You can still browse for one.'
              )}
            </p>
          )}
        </div>
      )}

      <div className="ImportExportWizard__filePicker">
        <input
          id="heroic-import-file"
          type="text"
          value={filePath}
          readOnly
          placeholder={t(
            'import-export.step1.placeholder',
            'No backup file selected'
          )}
        />
        <SvgButton
          onClick={chooseFile}
          disabled={validating}
          title={t('import-export.step1.browse', 'Browse for a backup file')}
          className="ImportExportWizard__filePickerIcon"
        >
          <FolderIcon />
        </SvgButton>
      </div>
      {validating && (
        <p className="ImportExportWizard__hint">
          {t('import-export.validating', 'Validating...')}
        </p>
      )}
      {error && (
        <div className="ImportExportWizard__errorBox" role="alert">
          <WarningAmberIcon />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
