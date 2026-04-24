import { useTranslation } from 'react-i18next'

import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'

import type { HeroicBackupValidationReport } from 'common/types/importExport'
import type { Runner } from 'common/types'

import { StatusPill, runnerLabel } from '../shared'

interface Props {
  validation: HeroicBackupValidationReport
  included: Record<Runner, boolean>
  setIncluded: (v: Record<Runner, boolean>) => void
}

export default function StepCredentials({
  validation,
  included,
  setIncluded
}: Props) {
  const { t } = useTranslation()
  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step5.title', 'Store logins')}
      </h3>
      <p className="ImportExportWizard__hint">
        {t(
          'import-export.step5.hint',
          'Credentials are imported as-is. If a token has expired, you will be asked to log in again next time you open the store.'
        )}
      </p>
      <ul className="ImportExportWizard__credList">
        {validation.credentials.map((cred) => (
          <li key={cred.runner} className="ImportExportWizard__credRow">
            <div className="ImportExportWizard__credLeft">
              <div>
                <div className="ImportExportWizard__credName">
                  {runnerLabel(cred.runner)}
                </div>
                {cred.displayName && (
                  <div className="ImportExportWizard__credUser">
                    {cred.displayName}
                  </div>
                )}
              </div>
            </div>
            <StatusPill status={cred.present ? 'info' : 'missing'}>
              {cred.present
                ? t('import-export.step5.found', 'Found in backup')
                : t('import-export.step5.missing', 'Not in backup')}
            </StatusPill>
            <ToggleSwitch
              htmlId={`ie-cred-${cred.runner}`}
              title={t('import-export.step5.include', 'Include')}
              value={!!included[cred.runner]}
              disabled={!cred.present}
              handleChange={() =>
                setIncluded({
                  ...included,
                  [cred.runner]: !included[cred.runner]
                })
              }
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
