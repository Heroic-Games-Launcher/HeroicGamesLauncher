import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import PathSelectionBox from 'frontend/components/UI/PathSelectionBox'

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
      <PathSelectionBox
        htmlId="heroic-import-file"
        type="file"
        path={filePath}
        onPathChange={(path) => {
          if (path) onPick(path)
        }}
        pathDialogTitle={t(
          'import-export.pick-backup',
          'Choose a Heroic backup archive'
        )}
        pathDialogFilters={[{ name: 'Heroic backup', extensions: ['zip'] }]}
        canEditPath={false}
        noDeleteButton
        disabled={validating}
      />
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
