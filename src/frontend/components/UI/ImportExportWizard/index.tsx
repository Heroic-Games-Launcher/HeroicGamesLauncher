import './index.scss'

import { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'
import PathSelectionBox from 'frontend/components/UI/PathSelectionBox'
import ContextProvider from 'frontend/state/ContextProvider'

import type {
  HeroicApplyResult,
  HeroicBackupStageId,
  HeroicBackupValidationReport,
  PerGamePathOverride
} from 'common/types/importExport'
import type { Runner } from 'common/types'

import { STAGE_LABELS } from './labels'

const STEP_TITLES = [
  'Pick a backup file',
  'Summary',
  'Global settings',
  'Per-game settings',
  'Store logins',
  'Library & system',
  'Done'
] as const

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6

type PathAction = 'browse' | 'ignore' | 'skip' | 'download' | 'default-prefix'

interface PathChoice {
  installAction: PathAction
  installOverride?: string
  prefixAction: PathAction
  prefixOverride?: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function ImportExportWizard({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)

  const [step, setStep] = useState<WizardStep>(0)
  const [filePath, setFilePath] = useState('')
  const [validation, setValidation] =
    useState<HeroicBackupValidationReport | null>(null)
  const [validating, setValidating] = useState(false)
  const [validateError, setValidateError] = useState<string | null>(null)

  const [overwriteGlobal, setOverwriteGlobal] = useState(false)
  const [includeGlobal, setIncludeGlobal] = useState(true)
  const [includedApps, setIncludedApps] = useState<Set<string>>(new Set())
  const [appFilter, setAppFilter] = useState('')
  const [includedCredentials, setIncludedCredentials] = useState<
    Record<Runner, boolean>
  >({
    legendary: true,
    gog: true,
    nile: true,
    zoom: true,
    sideload: true
  })
  const [pathChoices, setPathChoices] = useState<Record<string, PathChoice>>(
    {}
  )
  const [includedWineVersions, setIncludedWineVersions] = useState<Set<string>>(
    new Set()
  )
  const [downloadMissingGames, setDownloadMissingGames] = useState(true)

  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<HeroicApplyResult | null>(null)

  useEffect(() => {
    if (!open) {
      setStep(0)
      setFilePath('')
      setValidation(null)
      setValidateError(null)
      setApplyResult(null)
      setAppFilter('')
      setPathChoices({})
    }
  }, [open])

  useEffect(() => {
    if (!validation) return
    const all = new Set(validation.perGameAppNames)
    setIncludedApps(all)

    const initial: Record<string, PathChoice> = {}
    for (const issue of validation.pathIssues) {
      initial[issue.appName] = {
        installAction: issue.installPathIssue ? 'download' : 'ignore',
        prefixAction: 'ignore'
      }
    }
    setPathChoices(initial)

    setIncludedWineVersions(
      new Set(
        validation.missingWineVersions
          .filter((v) => v.downloadable)
          .map((v) => v.version ?? v.displayName)
      )
    )
  }, [validation])

  const includedStages: HeroicBackupStageId[] = useMemo(() => {
    if (!validation) return []
    return validation.manifest.stages.filter((s) => {
      if (s === 'globalSettings') return includeGlobal
      if (s === 'credentials') {
        return Object.values(includedCredentials).some(Boolean)
      }
      if (s === 'perGameSettings') return includedApps.size > 0
      return true
    })
  }, [validation, includeGlobal, includedApps, includedCredentials])

  async function pickBackupFile() {
    const selected = await window.api.openDialog({
      title: t(
        'import-export.pick-backup',
        'Choose a Heroic backup archive'
      ),
      properties: ['openFile'],
      filters: [{ name: 'Heroic backup', extensions: ['zip'] }]
    })
    if (typeof selected === 'string') {
      setFilePath(selected)
      await runValidation(selected)
    }
  }

  async function runValidation(path: string) {
    setValidating(true)
    setValidateError(null)
    try {
      const report = await window.api.validateHeroicBackup(path)
      setValidation(report)
      if (report.ok) {
        setStep(1)
      }
    } catch (err) {
      setValidateError(String(err))
    } finally {
      setValidating(false)
    }
  }

  function toggleApp(appName: string) {
    setIncludedApps((prev) => {
      const next = new Set(prev)
      if (next.has(appName)) next.delete(appName)
      else next.add(appName)
      return next
    })
  }

  function setAllApps(include: boolean) {
    if (!validation) return
    setIncludedApps(include ? new Set(validation.perGameAppNames) : new Set())
  }

  function stepIsReachable(target: WizardStep): boolean {
    if (!validation) return target === 0
    return target <= step
  }

  function goToStep(target: WizardStep) {
    if (stepIsReachable(target)) setStep(target)
  }

  function nextStep() {
    setStep((s) => (Math.min(6, s + 1) as WizardStep))
  }

  function prevStep() {
    setStep((s) => (Math.max(0, s - 1) as WizardStep))
  }

  async function applyBackup() {
    if (!validation) return
    setApplying(true)
    try {
      const overrides: PerGamePathOverride[] = []
      for (const issue of validation.pathIssues) {
        const choice = pathChoices[issue.appName]
        if (!choice) continue
        const o: PerGamePathOverride = { appName: issue.appName }
        if (choice.installAction === 'browse' && choice.installOverride)
          o.installPath = choice.installOverride
        if (choice.installAction === 'skip') o.skipInstallPath = true
        if (choice.installAction === 'download' && downloadMissingGames)
          o.installAfterImport = true
        if (choice.prefixAction === 'browse' && choice.prefixOverride)
          o.prefixPath = choice.prefixOverride
        if (choice.prefixAction === 'default-prefix') o.useDefaultPrefix = true
        if (Object.keys(o).length > 1) overrides.push(o)
      }

      const result = await window.api.applyHeroicBackup({
        sourcePath: filePath,
        stages: includedStages,
        overwriteGlobalSettings: overwriteGlobal,
        includedAppNames: Array.from(includedApps),
        includedCredentials,
        perGameOverrides: overrides,
        includedWineVersions: Array.from(includedWineVersions)
      })
      setApplyResult(result)
      setStep(6)
    } finally {
      setApplying(false)
    }
  }

  if (!open) return null

  return (
    <Dialog
      className="ImportExportWizard"
      onClose={onClose}
      showCloseButton
    >
      <DialogHeader onClose={onClose}>
        <div className="ImportExportWizard__titleRow">
          <span>{t('import-export.wizard-title', 'Import Heroic backup')}</span>
          <span className="ImportExportWizard__stepCounter">
            {t('import-export.step-counter', 'Step {{current}} of {{total}}', {
              current: step + 1,
              total: STEP_TITLES.length
            })}
          </span>
        </div>
      </DialogHeader>

      <div className="ImportExportWizard__stepper" role="tablist">
        {STEP_TITLES.map((title, idx) => (
          <button
            key={title}
            type="button"
            role="tab"
            aria-selected={idx === step}
            className={classNames('ImportExportWizard__stepperItem', {
              'is-active': idx === step,
              'is-done': idx < step,
              'is-disabled': !stepIsReachable(idx as WizardStep)
            })}
            onClick={() => goToStep(idx as WizardStep)}
            disabled={!stepIsReachable(idx as WizardStep)}
          >
            <span className="ImportExportWizard__stepperNumber">{idx + 1}</span>
            <span className="ImportExportWizard__stepperLabel">{title}</span>
          </button>
        ))}
      </div>

      <DialogContent className="ImportExportWizard__body">
        <div
          key={step}
          className="ImportExportWizard__stepContent fadeIn"
        >
          {step === 0 && (
            <StepPickFile
              filePath={filePath}
              onPick={pickBackupFile}
              validating={validating}
              error={validateError}
            />
          )}
          {step === 1 && validation && (
            <StepSummary
              validation={validation}
              currentPlatform={platform}
            />
          )}
          {step === 2 && validation && (
            <StepGlobalSettings
              validation={validation}
              includeGlobal={includeGlobal}
              setIncludeGlobal={setIncludeGlobal}
              overwriteGlobal={overwriteGlobal}
              setOverwriteGlobal={setOverwriteGlobal}
            />
          )}
          {step === 3 && validation && (
            <StepPerGame
              validation={validation}
              includedApps={includedApps}
              toggleApp={toggleApp}
              setAllApps={setAllApps}
              appFilter={appFilter}
              setAppFilter={setAppFilter}
            />
          )}
          {step === 4 && validation && (
            <StepCredentials
              validation={validation}
              included={includedCredentials}
              setIncluded={setIncludedCredentials}
            />
          )}
          {step === 5 && validation && (
            <StepLibrarySystem
              validation={validation}
              pathChoices={pathChoices}
              setPathChoices={setPathChoices}
              includedWineVersions={includedWineVersions}
              setIncludedWineVersions={setIncludedWineVersions}
              downloadMissingGames={downloadMissingGames}
              setDownloadMissingGames={setDownloadMissingGames}
            />
          )}
          {step === 6 && (
            <StepDone
              applyResult={applyResult}
              applying={applying}
              onClose={onClose}
              rollbackHintPath={applyResult?.rollbackPath}
            />
          )}
        </div>
      </DialogContent>

      <DialogFooter>
        <div className="ImportExportWizard__footer">
          <button
            type="button"
            className="button is-tertiary"
            onClick={prevStep}
            disabled={step === 0 || applying || step === 6}
          >
            {t('import-export.back', 'Back')}
          </button>
          {step < 5 && (
            <button
              type="button"
              className="button is-primary"
              disabled={!validation || validating || step === 0}
              onClick={nextStep}
            >
              {t('import-export.next', 'Next')}
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              className="button is-primary"
              onClick={applyBackup}
              disabled={applying}
            >
              {applying
                ? t('import-export.applying', 'Applying...')
                : t('import-export.apply', 'Apply backup')}
            </button>
          )}
          {step === 6 && (
            <button
              type="button"
              className="button is-primary"
              onClick={onClose}
            >
              {t('import-export.close', 'Close')}
            </button>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  )
}

function StepPickFile({
  filePath,
  onPick,
  validating,
  error
}: {
  filePath: string
  onPick: () => void
  validating: boolean
  error: string | null
}) {
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

function StepSummary({
  validation,
  currentPlatform
}: {
  validation: HeroicBackupValidationReport
  currentPlatform: string
}) {
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
                {t('import-export.different-platform', 'different from current ({{current}})', {
                  current: currentPlatform
                })}
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
      </dl>
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

function StepGlobalSettings({
  validation,
  includeGlobal,
  setIncludeGlobal,
  overwriteGlobal,
  setOverwriteGlobal
}: {
  validation: HeroicBackupValidationReport
  includeGlobal: boolean
  setIncludeGlobal: (v: boolean) => void
  overwriteGlobal: boolean
  setOverwriteGlobal: (v: boolean) => void
}) {
  const { t } = useTranslation()
  const { manifest } = validation
  const hasGlobal = manifest.stages.includes('globalSettings')
  return (
    <section>
      <h3 className="ImportExportWizard__heading">
        {t('import-export.step3.title', 'Global settings, themes and fixes')}
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
            title={t(
              'import-export.step3.toggle',
              'Import global settings (includes custom themes and compatibility fixes)'
            )}
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
          <p className="ImportExportWizard__meta">
            {t('import-export.step3.counts', {
              defaultValue:
                'Includes {{fixes}}, {{themes}}.',
              fixes: manifest.counts.fixesIncluded
                ? t('import-export.step3.fixes-yes', 'compatibility fixes')
                : t('import-export.step3.fixes-no', 'no compatibility fixes'),
              themes: manifest.counts.themesIncluded
                ? t('import-export.step3.themes-yes', 'custom themes')
                : t('import-export.step3.themes-no', 'no custom themes')
            })}
          </p>
        </>
      )}
    </section>
  )
}

function StepPerGame({
  validation,
  includedApps,
  toggleApp,
  setAllApps,
  appFilter,
  setAppFilter
}: {
  validation: HeroicBackupValidationReport
  includedApps: Set<string>
  toggleApp: (appName: string) => void
  setAllApps: (include: boolean) => void
  appFilter: string
  setAppFilter: (v: string) => void
}) {
  const { t } = useTranslation()
  const filter = appFilter.trim().toLowerCase()
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
        <button
          type="button"
          className="button is-tertiary"
          onClick={() => setAllApps(true)}
        >
          {t('import-export.step4.selectAll', 'Select all')}
        </button>
        <button
          type="button"
          className="button is-tertiary"
          onClick={() => setAllApps(false)}
        >
          {t('import-export.step4.deselectAll', 'Deselect all')}
        </button>
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
                    ({runnerLabel(runner)})
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

function StepCredentials({
  validation,
  included,
  setIncluded
}: {
  validation: HeroicBackupValidationReport
  included: Record<Runner, boolean>
  setIncluded: (v: Record<Runner, boolean>) => void
}) {
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
            <div className="ImportExportWizard__credMiddle">
              <StatusPill status={cred.present ? 'info' : 'missing'}>
                {cred.present
                  ? t('import-export.step5.found', 'Found in backup')
                  : t('import-export.step5.missing', 'Not in backup')}
              </StatusPill>
            </div>
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

function StepLibrarySystem({
  validation,
  pathChoices,
  setPathChoices,
  includedWineVersions,
  setIncludedWineVersions,
  downloadMissingGames,
  setDownloadMissingGames
}: {
  validation: HeroicBackupValidationReport
  pathChoices: Record<string, PathChoice>
  setPathChoices: (v: Record<string, PathChoice>) => void
  includedWineVersions: Set<string>
  setIncludedWineVersions: (v: Set<string>) => void
  downloadMissingGames: boolean
  setDownloadMissingGames: (v: boolean) => void
}) {
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
                <li
                  key={v.displayName}
                  className="ImportExportWizard__appRow"
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!v.downloadable}
                      onChange={() => toggleWineVersion(versionKey)}
                    />
                    <span className="ImportExportWizard__appTitle">
                      {v.displayName}
                      <StatusPill
                        status={v.downloadable ? 'info' : 'warning'}
                      >
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
              const checked = pathChoices[issue.appName]?.installAction ===
                'download'
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
              <li
                key={issue.appName}
                className="ImportExportWizard__issueCard"
              >
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
                  label={t(
                    'import-export.step6.prefixPath',
                    'Wine prefix'
                  )}
                  currentPath={issue.prefixPath ?? ''}
                  action={
                    pathChoices[issue.appName]?.prefixAction ?? 'ignore'
                  }
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

function PathActionRow({
  label,
  currentPath,
  action,
  override,
  actions,
  onAction
}: {
  label: string
  currentPath: string
  action: PathAction
  override?: string
  actions: PathAction[]
  onAction: (action: PathAction, path?: string) => void
}) {
  const { t } = useTranslation()

  async function pickPath() {
    const picked = await window.api.openDialog({
      properties: ['openDirectory'],
      title: label
    })
    if (typeof picked === 'string') {
      onAction('browse', picked)
    }
  }

  return (
    <div className="ImportExportWizard__pathRow">
      <div className="ImportExportWizard__pathLabel">{label}</div>
      <div className="ImportExportWizard__pathValue">
        <code>{override ?? currentPath}</code>
      </div>
      <div className="ImportExportWizard__pathActions">
        {actions.includes('browse') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'browse'
            })}
            onClick={pickPath}
          >
            {t('import-export.action.browse', 'Browse')}
          </button>
        )}
        {actions.includes('ignore') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'ignore'
            })}
            onClick={() => onAction('ignore')}
          >
            {t('import-export.action.ignore', 'Keep')}
          </button>
        )}
        {actions.includes('skip') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'skip'
            })}
            onClick={() => onAction('skip')}
          >
            {t('import-export.action.skip', 'Skip game')}
          </button>
        )}
        {actions.includes('download') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'download'
            })}
            onClick={() => onAction('download')}
          >
            {t('import-export.action.download', 'Download missing')}
          </button>
        )}
        {actions.includes('default-prefix') && (
          <button
            type="button"
            className={classNames('button is-tertiary', {
              'is-selected': action === 'default-prefix'
            })}
            onClick={() => onAction('default-prefix')}
          >
            {t('import-export.action.defaultPrefix', 'Use default prefix')}
          </button>
        )}
      </div>
    </div>
  )
}

function StepDone({
  applyResult,
  applying,
  onClose,
  rollbackHintPath
}: {
  applyResult: HeroicApplyResult | null
  applying: boolean
  onClose: () => void
  rollbackHintPath?: string
}) {
  const { t } = useTranslation()
  void onClose

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
                {t(`import-export.stage.${s.stage}`, stageFriendlyLabel(s.stage))}
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

function StatusPill({
  status,
  children
}: {
  status: 'info' | 'warning' | 'missing'
  children: React.ReactNode
}) {
  return (
    <span
      className={classNames('ImportExportWizard__pill', `is-${status}`)}
    >
      {children}
    </span>
  )
}

function runnerLabel(runner: Runner): string {
  switch (runner) {
    case 'legendary':
      return 'Epic Games'
    case 'gog':
      return 'GOG'
    case 'nile':
      return 'Amazon'
    case 'zoom':
      return 'ZOOM'
    default:
      return 'Sideloaded'
  }
}

function stageFriendlyLabel(stage: HeroicBackupStageId): string {
  return STAGE_LABELS[stage]
}
