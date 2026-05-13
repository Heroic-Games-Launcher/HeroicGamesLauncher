import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'

import type { HeroicBackupValidationReport } from 'common/types/importExport'

interface Props {
  validation: HeroicBackupValidationReport
  includeGlobal: boolean
  setIncludeGlobal: (v: boolean) => void
  overwriteGlobal: boolean
  setOverwriteGlobal: (v: boolean) => void
}

export default function StepGlobalSettings({
  validation,
  includeGlobal,
  setIncludeGlobal,
  overwriteGlobal,
  setOverwriteGlobal
}: Props) {
  const { t } = useTranslation()
  const { manifest } = validation
  const hasGlobal = manifest.stages.includes('globalSettings')
  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step3.title', 'Global settings')}
      </h3>
      {!hasGlobal ? (
        <p className="ImportExportWizard__hint">
          {t(
            'import-export.step3.none',
            'This backup does not contain global settings.'
          )}
        </p>
      ) : (
        <>
          <ToggleSwitch
            htmlId="ie-include-global"
            title={t('import-export.step3.toggle', 'Import global settings')}
            value={includeGlobal}
            handleChange={() => setIncludeGlobal(!includeGlobal)}
          />
          <div className="ImportExportWizard__warningCard">
            <WarningAmberIcon />
            <div>
              <strong>
                {t(
                  'import-export.step3.overwriteTitle',
                  'Overwrite my current global settings'
                )}
              </strong>
              <p>
                {t(
                  'import-export.step3.overwriteBody',
                  'Off by default. Turn this on to replace your current Heroic settings with the ones in the backup.'
                )}
              </p>
              <ToggleSwitch
                htmlId="ie-overwrite-global"
                title={t(
                  'import-export.step3.overwrite',
                  'Overwrite current global settings'
                )}
                value={overwriteGlobal}
                handleChange={() => setOverwriteGlobal(!overwriteGlobal)}
                disabled={!includeGlobal}
              />
            </div>
          </div>
        </>
      )}
    </section>
  )
}
