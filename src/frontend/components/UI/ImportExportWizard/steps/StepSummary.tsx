import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { Table } from 'frontend/components/UI'

import type { HeroicBackupValidationReport } from 'common/types/importExport'
import type { Runner } from 'common/types'

import { runnerLabel } from '../shared'

interface Props {
  validation: HeroicBackupValidationReport
  currentPlatform: string
}

function platformName(platform: string): string {
  if (platform === 'darwin') return 'macOS'
  if (platform === 'win32') return 'Windows'
  return 'Linux'
}

export default function StepSummary({ validation, currentPlatform }: Props) {
  const { t } = useTranslation()
  const { manifest, platformMatches, formatSupported, warnings, errors } =
    validation
  const created = new Date(manifest.createdAt).toLocaleString()

  const rows: { key: string; label: string; value: ReactNode }[] = [
    {
      key: 'created',
      label: t('import-export.created', 'Created'),
      value: created
    },
    {
      key: 'version',
      label: t('import-export.version', 'Heroic version'),
      value: manifest.heroicVersion
    },
    {
      key: 'platform',
      label: t('import-export.platform', 'Platform'),
      value: (
        <>
          {platformName(manifest.platform)}
          {!platformMatches && (
            <span className="ImportExportWizard__summaryWarning">
              <WarningAmberIcon fontSize="inherit" />
              {t(
                'import-export.different-platform',
                'different from current ({{current}})',
                { current: platformName(currentPlatform) }
              )}
            </span>
          )}
        </>
      )
    },
    {
      key: 'perGame',
      label: t('import-export.per-game', 'Per-game settings'),
      value: manifest.counts.perGameSettings
    },
    {
      key: 'installedGames',
      label: t('import-export.installed-games', 'Installed games'),
      value:
        Object.entries(manifest.counts.installedGames)
          .map(
            ([runner, count]) => `${runnerLabel(runner as Runner, t)}: ${count}`
          )
          .join(', ') || '0'
    },
    {
      key: 'wineVersions',
      label: t('import-export.wine-versions', 'Wine versions'),
      value: manifest.counts.wineVersions
    }
  ]

  if (manifest.stages.includes('categories')) {
    rows.push({
      key: 'categories',
      label: t('import-export.categories', 'Custom categories'),
      value: manifest.counts.categories ?? 0
    })
  }

  if (manifest.stages.includes('playtime')) {
    rows.push({
      key: 'playtime',
      label: t('import-export.stage.playtime', 'Playtime and play history'),
      value: manifest.counts.playtimeGames ?? 0
    })
  }

  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step2.title', 'Backup summary')}
      </h3>
      <Table
        columns={[
          {
            key: 'label',
            header: t('import-export.summaryProperty', 'Property'),
            render: (row) => row.label,
            width: '40%'
          },
          {
            key: 'value',
            header: t('import-export.summaryValue', 'Value'),
            render: (row) => row.value
          }
        ]}
        rows={rows}
        rowKey={(row) => row.key}
        density="compact"
        stickyHeader={false}
      />
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
