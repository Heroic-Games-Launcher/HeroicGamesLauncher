import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import PathSelectionBox from 'frontend/components/UI/PathSelectionBox'

interface Props {
  filePath: string
  onPick: () => void
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
          'Pick a Heroic backup archive (.zip) previously exported from Heroic.'
        )}
      </p>
      <div className="ImportExportWizard__pickRow">
        <PathSelectionBox
          htmlId="heroic-import-file"
          type="file"
          path={filePath}
          onPathChange={() => {
            /* no-op — picker handles the selection via onPick */
          }}
          pathDialogTitle={t(
            'import-export.pick-backup',
            'Choose a Heroic backup archive'
          )}
          pathDialogFilters={[{ name: 'Heroic backup', extensions: ['zip'] }]}
          canEditPath={false}
          noDeleteButton
        />
        <button
          type="button"
          className="button is-primary"
          onClick={onPick}
          disabled={validating}
        >
          {validating
            ? t('import-export.validating', 'Validating...')
            : t('import-export.choose-file', 'Choose file')}
        </button>
      </div>
      {error && (
        <div className="ImportExportWizard__errorBox" role="alert">
          <WarningAmberIcon />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
