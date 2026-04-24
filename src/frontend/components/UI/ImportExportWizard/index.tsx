import './index.scss'

import { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import ContextProvider from 'frontend/state/ContextProvider'

import type {
  HeroicApplyResult,
  HeroicBackupStageId,
  HeroicBackupValidationReport,
  PerGamePathOverride
} from 'common/types/importExport'
import type { Runner } from 'common/types'

import {
  StepCredentials,
  StepDone,
  StepGlobalSettings,
  StepLibrarySystem,
  StepPerGame,
  StepPickFile,
  StepSummary
} from './steps'
import type { PathChoice } from './shared'

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
  const [wineBusy, setWineBusy] = useState(false)

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
    setIncludedApps(new Set(validation.perGameAppNames))

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

  async function pickBackupFile(path: string) {
    setFilePath(path)
    await runValidation(path)
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
      showCloseButton={!wineBusy}
      disableBackdropClose
    >
      <DialogHeader onClose={onClose}>
        <div className="ImportExportWizard__titleRow">
          <span>
            {t('import-export.wizard-title', 'Import Heroic backup')}
          </span>
          <span className="ImportExportWizard__stepCounter">
            {t(
              'import-export.step-counter',
              'Step {{current}} of {{total}}',
              {
                current: step + 1,
                total: STEP_TITLES.length
              }
            )}
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
        <div key={step} className="ImportExportWizard__stepContent fadeIn">
          {step === 0 && (
            <StepPickFile
              filePath={filePath}
              onPick={(path) => {
                void pickBackupFile(path)
              }}
              validating={validating}
              error={validateError}
            />
          )}
          {step === 1 && validation && (
            <StepSummary validation={validation} currentPlatform={platform} />
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
              rollbackHintPath={applyResult?.rollbackPath}
              onWineBusyChange={setWineBusy}
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
              disabled={!validation || validating}
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
              disabled={wineBusy}
              title={
                wineBusy
                  ? t(
                      'import-export.step7.wine-busy-hint',
                      'Wait until Wine / Proton finishes installing'
                    )
                  : undefined
              }
            >
              {t('import-export.close', 'Close')}
            </button>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  )
}
