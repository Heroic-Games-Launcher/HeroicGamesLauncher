import { useTranslation } from 'react-i18next'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'

import type { HeroicBackupValidationReport } from 'common/types/importExport'

import { PathActionRow, PathChoice, StatusPill, runnerLabel } from '../shared'

interface Props {
  validation: HeroicBackupValidationReport
  pathChoices: Record<string, PathChoice>
  setPathChoices: (v: Record<string, PathChoice>) => void
  includedWineVersions: Set<string>
  setIncludedWineVersions: (v: Set<string>) => void
  downloadMissingGames: boolean
  setDownloadMissingGames: (v: boolean) => void
}

export default function StepLibrarySystem({
  validation,
  pathChoices,
  setPathChoices,
  includedWineVersions,
  setIncludedWineVersions,
  downloadMissingGames,
  setDownloadMissingGames
}: Props) {
  const { t } = useTranslation()
  const updateChoice = (appName: string, patch: Partial<PathChoice>) => {
    setPathChoices({
      ...pathChoices,
      [appName]: {
        ...(pathChoices[appName] ?? {
          installAction: 'ignore',
          prefixAction: 'ignore'
        }),
        ...patch
      }
    })
  }

  const { missingWineVersions, pathIssues } = validation
  const installIssues = pathIssues.filter((i) => i.installPathIssue)
  const prefixIssues = pathIssues.filter((i) => i.prefixPathIssue)

  const selectAllInstall = (include: boolean) => {
    const next = { ...pathChoices }
    for (const issue of installIssues) {
      next[issue.appName] = {
        ...(next[issue.appName] ?? {
          installAction: 'ignore',
          prefixAction: 'ignore'
        }),
        installAction: include ? 'download' : 'ignore'
      }
    }
    setPathChoices(next)
  }

  const toggleWineVersion = (version: string) => {
    const next = new Set(includedWineVersions)
    if (next.has(version)) next.delete(version)
    else next.add(version)
    setIncludedWineVersions(next)
  }

  const selectAllWine = (include: boolean) => {
    if (!include) {
      setIncludedWineVersions(new Set())
      return
    }
    setIncludedWineVersions(
      new Set(
        missingWineVersions
          .filter((v) => v.downloadable)
          .map((v) => v.version ?? v.displayName)
      )
    )
  }

  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step6.title', 'Library and system')}
      </h3>

      {missingWineVersions.length > 0 && (
        <details open className="ImportExportWizard__details">
          <summary>
            {t(
              'import-export.step6.wineSummary',
              'Missing Wine / Proton versions ({{count}})',
              { count: missingWineVersions.length }
            )}
          </summary>
          <p className="ImportExportWizard__hint">
            {t(
              'import-export.step6.wineHint',
              'These versions were installed on the source system but are missing locally. Pick which ones to download — versions that are no longer available are disabled.'
            )}
          </p>
          <div className="ImportExportWizard__toolbar">
            <button
              type="button"
              className="button is-tertiary"
              onClick={() => selectAllWine(true)}
            >
              {t('import-export.step4.selectAll', 'Select all')}
            </button>
            <button
              type="button"
              className="button is-tertiary"
              onClick={() => selectAllWine(false)}
            >
              {t('import-export.step4.deselectAll', 'Deselect all')}
            </button>
          </div>
          <ul className="ImportExportWizard__appList">
            {missingWineVersions.map((v) => {
              const versionKey = v.version ?? v.displayName
              const checked = includedWineVersions.has(versionKey)
              return (
                <li key={v.displayName} className="ImportExportWizard__appRow">
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!v.downloadable}
                      onChange={() => toggleWineVersion(versionKey)}
                    />
                    <span className="ImportExportWizard__appTitle">
                      {v.displayName}
                      <StatusPill status={v.downloadable ? 'info' : 'warning'}>
                        {v.downloadable
                          ? t(
                              'import-export.step6.wine-downloadable',
                              'Downloadable'
                            )
                          : t(
                              'import-export.step6.wine-unavailable',
                              'Not available'
                            )}
                      </StatusPill>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {installIssues.length > 0 && (
        <details open className="ImportExportWizard__details">
          <summary>
            {t(
              'import-export.step6.installPathsSummary',
              'Games with missing install paths ({{count}})',
              { count: installIssues.length }
            )}
          </summary>
          <p className="ImportExportWizard__hint">
            {t(
              'import-export.step6.installPathsHint',
              'The install folders these games used are not on this system. Re-download the ones you want back; unchecked games stay listed with their original (broken) path.'
            )}
          </p>
          <ToggleSwitch
            htmlId="ie-download-missing"
            title={t(
              'import-export.step6.downloadMissing',
              'Re-download selected missing games after import'
            )}
            value={downloadMissingGames}
            handleChange={() => setDownloadMissingGames(!downloadMissingGames)}
          />
          <div className="ImportExportWizard__toolbar">
            <button
              type="button"
              className="button is-tertiary"
              onClick={() => selectAllInstall(true)}
              disabled={!downloadMissingGames}
            >
              {t('import-export.step4.selectAll', 'Select all')}
            </button>
            <button
              type="button"
              className="button is-tertiary"
              onClick={() => selectAllInstall(false)}
              disabled={!downloadMissingGames}
            >
              {t('import-export.step4.deselectAll', 'Deselect all')}
            </button>
          </div>
          <ul className="ImportExportWizard__appList">
            {installIssues.map((issue) => {
              const checked =
                pathChoices[issue.appName]?.installAction === 'download'
              return (
                <li key={issue.appName} className="ImportExportWizard__appRow">
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!downloadMissingGames}
                      onChange={() =>
                        updateChoice(issue.appName, {
                          installAction: checked ? 'ignore' : 'download'
                        })
                      }
                    />
                    <span className="ImportExportWizard__appTitle">
                      {issue.title}{' '}
                      <span className="ImportExportWizard__appStore">
                        ({runnerLabel(issue.runner)})
                      </span>
                      <span className="ImportExportWizard__appBrokenPath">
                        {issue.installPath}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {prefixIssues.length > 0 && (
        <details open className="ImportExportWizard__details">
          <summary>
            {t(
              'import-export.step6.prefixPathsSummary',
              'Games with missing Wine prefixes ({{count}})',
              { count: prefixIssues.length }
            )}
          </summary>
          <p className="ImportExportWizard__hint">
            {t(
              'import-export.step6.prefixPathsHint',
              'Choose what to do with each prefix individually — switching to the default prefix is usually the simplest fix.'
            )}
          </p>
          <ul className="ImportExportWizard__issueList">
            {prefixIssues.map((issue) => (
              <li key={issue.appName} className="ImportExportWizard__issueCard">
                <div className="ImportExportWizard__issueHeader">
                  <div>
                    <strong>{issue.title}</strong>
                    <span className="ImportExportWizard__issueRunner">
                      {runnerLabel(issue.runner)}
                    </span>
                  </div>
                  <WarningAmberIcon className="ImportExportWizard__issueWarn" />
                </div>
                <PathActionRow
                  label={t('import-export.step6.prefixPath', 'Wine prefix')}
                  currentPath={issue.prefixPath ?? ''}
                  action={pathChoices[issue.appName]?.prefixAction ?? 'ignore'}
                  override={pathChoices[issue.appName]?.prefixOverride}
                  actions={['browse', 'ignore', 'default-prefix']}
                  onAction={(a, path) =>
                    updateChoice(issue.appName, {
                      prefixAction: a,
                      prefixOverride: path
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </details>
      )}

      {validation.installedOK.length > 0 && (
        <details className="ImportExportWizard__details">
          <summary>
            {t(
              'import-export.step6.installedOKSummary',
              'Games found and ready ({{count}})',
              { count: validation.installedOK.length }
            )}
          </summary>
          <p className="ImportExportWizard__hint">
            {t(
              'import-export.step6.installedOKHint',
              'These games were installed on the source system and their folders still exist on this machine — they will be re-registered as-is.'
            )}
          </p>
          <ul className="ImportExportWizard__appList">
            {validation.installedOK.map((game) => (
              <li key={game.appName} className="ImportExportWizard__appRow">
                <div className="ImportExportWizard__okRow">
                  <CheckCircleOutlineIcon
                    className="ImportExportWizard__okIcon"
                    fontSize="small"
                  />
                  <span className="ImportExportWizard__appTitle">
                    {game.title}{' '}
                    <span className="ImportExportWizard__appStore">
                      ({runnerLabel(game.runner)})
                    </span>
                    <span className="ImportExportWizard__appBrokenPath">
                      {game.installPath}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {missingWineVersions.length === 0 && pathIssues.length === 0 && (
        <div className="ImportExportWizard__successBox">
          <CheckCircleOutlineIcon />
          <span>
            {t(
              'import-export.step6.allGood',
              'All install paths and wine versions are present on this system.'
            )}
          </span>
        </div>
      )}
    </section>
  )
}
