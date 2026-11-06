import { useTranslation } from 'react-i18next'

import type { HeroicBackupValidationReport } from 'common/types/importExport'

import { runnerLabel } from '../shared'

interface Props {
  validation: HeroicBackupValidationReport
  includedApps: Set<string>
  toggleApp: (appName: string) => void
  setAllApps: (include: boolean) => void
  appFilter: string
  setAppFilter: (v: string) => void
}

export default function StepPerGame({
  validation,
  includedApps,
  toggleApp,
  setAllApps,
  appFilter,
  setAppFilter
}: Props) {
  const { t } = useTranslation()
  const filter = appFilter.trim().toLowerCase()
  const allSelected =
    validation.perGameAppNames.length > 0 &&
    includedApps.size === validation.perGameAppNames.length
  const visible = validation.perGameAppNames.filter((appName) => {
    if (!filter) return true
    const info = validation.gameTitles[appName]
    const title = info?.title ?? appName
    return (
      title.toLowerCase().includes(filter) ||
      appName.toLowerCase().includes(filter)
    )
  })
  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step4.title', 'Per-game settings to import')}
      </h3>
      <div className="ImportExportWizard__toolbar">
        <input
          type="text"
          placeholder={t('import-export.step4.filter', 'Filter games')}
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          className="ImportExportWizard__filter"
        />
      </div>
      <div className="ImportExportWizard__listControls">
        <label className="ImportExportWizard__selectAll">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setAllApps(!allSelected)}
          />
          {t('import-export.step4.selectAllGames', 'Select all games')}
        </label>
        <span className="ImportExportWizard__meta">
          {t(
            'import-export.step4.selected',
            '{{selected}} of {{total}} selected',
            {
              selected: includedApps.size,
              total: validation.perGameAppNames.length
            }
          )}
        </span>
      </div>
      <ul className="ImportExportWizard__appList">
        {visible.map((appName) => {
          const info = validation.gameTitles[appName]
          const title = info?.title ?? appName
          const runner = info?.runner ?? 'sideload'
          return (
            <li key={appName} className="ImportExportWizard__appRow">
              <label>
                <input
                  type="checkbox"
                  checked={includedApps.has(appName)}
                  onChange={() => toggleApp(appName)}
                />
                <span className="ImportExportWizard__appTitle">
                  {title}{' '}
                  <span className="ImportExportWizard__appStore">
                    ({runnerLabel(runner, t)})
                  </span>
                </span>
              </label>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li className="ImportExportWizard__meta">
            {t('import-export.step4.none', 'No games match the filter.')}
          </li>
        )}
      </ul>
    </section>
  )
}
