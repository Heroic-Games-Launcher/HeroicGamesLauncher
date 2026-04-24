import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import type { HeroicApplyResult } from 'common/types/importExport'

import { stageFriendlyLabel } from '../shared'

interface Props {
  applyResult: HeroicApplyResult | null
  applying: boolean
  rollbackHintPath?: string
}

export default function StepDone({
  applyResult,
  applying,
  rollbackHintPath
}: Props) {
  const { t } = useTranslation()

  async function restart() {
    await window.api.restartHeroic()
  }

  if (applying || !applyResult) {
    return (
      <section className="ImportExportWizard__done">
        <h3 className="ImportExportWizard__heading">
          {t('import-export.step7.applying', 'Applying backup...')}
        </h3>
      </section>
    )
  }

  return (
    <section className="ImportExportWizard__done">
      <div
        className={classNames('ImportExportWizard__hero', {
          'is-ok': applyResult.ok,
          'is-error': !applyResult.ok
        })}
      >
        {applyResult.ok ? (
          <CheckCircleOutlineIcon fontSize="large" />
        ) : (
          <WarningAmberIcon fontSize="large" />
        )}
        <h3>
          {applyResult.ok
            ? t('import-export.step7.success', 'Backup applied')
            : t('import-export.step7.failure', 'Some steps could not finish')}
        </h3>
      </div>

      <ul className="ImportExportWizard__stageList">
        {applyResult.stages.map((s) => (
          <li key={s.stage}>
            <span className="ImportExportWizard__stageDot" data-ok={s.ok} />
            <div>
              <div>
                {t(
                  `import-export.stage.${s.stage}`,
                  stageFriendlyLabel(s.stage)
                )}
              </div>
              {s.message && (
                <div className="ImportExportWizard__stageMsg">{s.message}</div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {applyResult.gamesQueuedForDownload.length > 0 && (
        <div className="ImportExportWizard__successBox">
          {t(
            'import-export.step7.queued',
            '{{count}} game(s) were queued to re-download.',
            { count: applyResult.gamesQueuedForDownload.length }
          )}
        </div>
      )}

      {rollbackHintPath && (
        <p className="ImportExportWizard__hint">
          {t(
            'import-export.step7.rollback-hint',
            'A rollback snapshot was saved. You can undo this import later from Settings > Import/Export.'
          )}
        </p>
      )}

      {applyResult.ok && (
        <div className="ImportExportWizard__restartBanner">
          <RestartAltIcon />
          <div>
            <strong>
              {t(
                'import-export.step7.restart-title',
                'Restart Heroic to apply all changes'
              )}
            </strong>
            <p>
              {t(
                'import-export.step7.restart-body',
                'Some settings are cached in memory and only take effect after a restart.'
              )}
            </p>
            <button
              type="button"
              className="button is-primary"
              onClick={restart}
            >
              {t('import-export.step7.restart-btn', 'Restart now')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
