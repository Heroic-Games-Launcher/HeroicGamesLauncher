import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import type { HeroicBackupValidationReport } from 'common/types/importExport'
import type { Runner } from 'common/types'

import { runnerLabel } from '../shared'

interface Props {
  validation: HeroicBackupValidationReport
  currentPlatform: string
}

export default function StepSummary({ validation, currentPlatform }: Props) {
  const { t } = useTranslation()
  const { manifest, platformMatches, formatSupported, warnings, errors } =
    validation
  const created = new Date(manifest.createdAt).toLocaleString()
  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step2.title', 'Backup summary')}
      </h3>
      <dl className="ImportExportWizard__summary">
        <div>
          <dt>{t('import-export.created', 'Created')}</dt>
          <dd>{created}</dd>
        </div>
        <div>
          <dt>{t('import-export.version', 'Heroic version')}</dt>
          <dd>{manifest.heroicVersion}</dd>
        </div>
        <div>
          <dt>{t('import-export.platform', 'Platform')}</dt>
          <dd>
            {manifest.platform}
            {!platformMatches && (
              <span className="ImportExportWizard__warningTag">
                <WarningAmberIcon fontSize="inherit" />
                {t(
                  'import-export.different-platform',
                  'different from current ({{current}})',
                  { current: currentPlatform }
                )}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('import-export.per-game', 'Per-game settings')}</dt>
          <dd>{manifest.counts.perGameSettings}</dd>
        </div>
        <div>
          <dt>{t('import-export.installed-games', 'Installed games')}</dt>
          <dd>
            {Object.entries(manifest.counts.installedGames)
              .map(
                ([runner, count]) =>
                  `${runnerLabel(runner as Runner)}: ${count}`
              )
              .join(', ') || '0'}
          </dd>
        </div>
        <div>
          <dt>{t('import-export.wine-versions', 'Wine versions')}</dt>
          <dd>{manifest.counts.wineVersions}</dd>
        </div>
        {manifest.stages.includes('categories') && (
          <div>
            <dt>{t('import-export.categories', 'Custom categories')}</dt>
            <dd>{manifest.counts.categories ?? 0}</dd>
          </div>
        )}
      </dl>
      {!platformMatches && (
        <div className="ImportExportWizard__warningCard">
          <WarningAmberIcon />
          <div>
            <strong>
              {t(
                'import-export.platform-limitations.title',
                'Importing across platforms has limitations'
              )}
            </strong>
            <ul className="ImportExportWizard__limitationsList">
              <li>
                {t(
                  'import-export.platform-limitations.works',
                  'Store logins, game library, sideloaded entries and custom categories work on any platform.'
                )}
              </li>
              <li>
                {t(
                  'import-export.platform-limitations.wine',
                  'Wine/Proton versions, prefixes and related settings only apply on Linux and macOS — they are skipped on Windows.'
                )}
              </li>
              <li>
                {t(
                  'import-export.platform-limitations.paths',
                  'Install paths from another operating system are usually invalid, so imported games may need to be reinstalled or have their paths fixed in the next steps.'
                )}
              </li>
              <li>
                {t(
                  'import-export.platform-limitations.settings',
                  'Global settings may reference tools and folders that do not exist here — review them before overwriting your current settings.'
                )}
              </li>
            </ul>
          </div>
        </div>
      )}
      {warnings.map((w) => (
        <div key={w} className="ImportExportWizard__warningBox">
          <WarningAmberIcon />
          <span>{w}</span>
        </div>
      ))}
      {errors.map((e) => (
        <div key={e} className="ImportExportWizard__errorBox">
          <WarningAmberIcon />
          <span>{e}</span>
        </div>
      ))}
      {!formatSupported && (
        <div className="ImportExportWizard__errorBox">
          <WarningAmberIcon />
          <span>
            {t(
              'import-export.unsupported-format',
              'This backup uses a newer format than this build of Heroic supports.'
            )}
          </span>
        </div>
      )}
    </section>
  )
}
