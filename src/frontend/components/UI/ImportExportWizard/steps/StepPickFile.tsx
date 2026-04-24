import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import FolderIcon from '@mui/icons-material/Folder'

import SvgButton from 'frontend/components/UI/SvgButton'

interface Props {
  filePath: string
  onPick: (path: string) => void
  validating: boolean
  error: string | null
}

export default function StepPickFile({
  filePath,
  onPick,
  validating,
  error
}: Props) {
  const { t } = useTranslation()

  async function chooseFile() {
    const selected = await window.api.openDialog({
      title: t(
        'import-export.pick-backup',
        'Choose a Heroic backup archive'
      ),
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
          'Pick a Heroic backup archive (.zip) previously exported from Heroic. Click the folder icon to browse.'
        )}
      </p>
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
          title={t(
            'import-export.step1.browse',
            'Browse for a backup file'
          )}
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
