import './index.css'

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RestoreIcon from '@mui/icons-material/Restore'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'

import ToggleSwitch from 'frontend/components/UI/ToggleSwitch'
import ImportExportWizard from 'frontend/components/UI/ImportExportWizard'
import {
  ALL_STAGES,
  STAGE_LABELS,
  timestampedBackupName
} from 'frontend/components/UI/ImportExportWizard/labels'

import type {
  HeroicApplyResult,
  HeroicBackupStageId,
  HeroicExportResult,
  HeroicRollbackSnapshot
} from 'common/types/importExport'

interface ImportExportNavState {
  openImport?: boolean
}

export default function ImportExportSettings() {
  const { t } = useTranslation()
  const location = useLocation()
  const openImportFromNav = Boolean(
    (location.state as ImportExportNavState | null)?.openImport
  )

  const [selectedStages, setSelectedStages] = useState<
    Set<HeroicBackupStageId>
  >(new Set(ALL_STAGES))
  const [outputDir, setOutputDir] = useState('')
  const [outputName, setOutputName] = useState(timestampedBackupName())
  const [exportInFlight, setExportInFlight] = useState(false)
  const [exportResult, setExportResult] = useState<HeroicExportResult | null>(
    null
  )

  const [wizardOpen, setWizardOpen] = useState(openImportFromNav)

  const [rollbackSnapshot, setRollbackSnapshot] =
    useState<HeroicRollbackSnapshot | null>(null)
  const [rollbackInFlight, setRollbackInFlight] = useState(false)
  const [rollbackResult, setRollbackResult] =
    useState<HeroicApplyResult | null>(null)

  useEffect(() => {
    void refreshRollback()
    void (async () => {
      const home = await window.api.getHomeDir()
      setOutputDir(home)
    })()
  }, [])

  async function refreshRollback() {
    const snap = await window.api.getRollbackSnapshot()
    setRollbackSnapshot(snap)
  }

  function toggleStage(stage: HeroicBackupStageId) {
    setSelectedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }

  async function pickOutputDir() {
    const picked = await window.api.openDialog({
      properties: ['openDirectory'],
      title: t(
        'import-export.export.pickDir',
        'Choose where to save the backup'
      )
    })
    if (typeof picked === 'string') setOutputDir(picked)
  }

  async function runExport() {
    if (!outputDir) {
      await pickOutputDir()
      return
    }
    setExportInFlight(true)
    setExportResult(null)
    try {
      const sep = outputDir.includes('\\') ? '\\' : '/'
      const finalPath = `${outputDir}${sep}${outputName}`
      const result = await window.api.exportHeroicBackup({
        outputPath: finalPath,
        stages: Array.from(selectedStages)
      })
      setExportResult(result)
      // Refresh the auto-generated filename for the next export
      setOutputName(timestampedBackupName())
    } finally {
      setExportInFlight(false)
    }
  }

  async function runRollback() {
    setRollbackInFlight(true)
    setRollbackResult(null)
    try {
      const result = await window.api.rollbackHeroicBackup()
      setRollbackResult(result)
      if (result.ok) setRollbackSnapshot(null)
    } finally {
      setRollbackInFlight(false)
    }
  }

  return (
    <div className="ImportExportSettings">
      <h3 className="settingSubheader">
        {t('settings.navbar.importExport', 'Import / Export')}
      </h3>

      <details className="ImportExportSettings__card" open={!openImportFromNav}>
        <summary>
          <span className="ImportExportSettings__cardTitle">
            <DownloadIcon />
            {t('import-export.export.title', 'Export Heroic')}
          </span>
          <span className="ImportExportSettings__summaryMeta">
            {t(
              'import-export.export.summary',
              '{{count}} of {{total}} included',
              {
                count: selectedStages.size,
                total: ALL_STAGES.length
              }
            )}
          </span>
        </summary>

        <p className="ImportExportSettings__hint">
          {t(
            'import-export.export.hint',
            'Bundle Heroic settings, logins and library into a single zip file you can restore later or move to another machine.'
          )}
        </p>

        <ul className="ImportExportSettings__stageList">
          {ALL_STAGES.map((stage) => (
            <li key={stage}>
              <ToggleSwitch
                htmlId={`ie-export-${stage}`}
                title={STAGE_LABELS[stage]}
                value={selectedStages.has(stage)}
                handleChange={() => toggleStage(stage)}
              />
            </li>
          ))}
        </ul>

        <div className="ImportExportSettings__exportRow">
          <div className="ImportExportSettings__outputDir">
            <div className="Field">
              <label htmlFor="ie-export-dir">
                {t('import-export.export.output', 'Output folder')}
              </label>
              <div className="ImportExportSettings__dirInput">
                <input
                  id="ie-export-dir"
                  type="text"
                  value={outputDir}
                  readOnly
                  placeholder={t(
                    'import-export.export.output-placeholder',
                    'Pick a folder...'
                  )}
                />
                <button
                  type="button"
                  className="button is-tertiary"
                  onClick={pickOutputDir}
                >
                  {t('import-export.browse', 'Browse')}
                </button>
              </div>
            </div>
            <div className="ImportExportSettings__filename">
              {t('import-export.export.filename', 'Filename')}:{' '}
              <code>{outputName}</code>
            </div>
          </div>
          <button
            type="button"
            className="button is-primary"
            disabled={exportInFlight || selectedStages.size === 0 || !outputDir}
            onClick={runExport}
          >
            {exportInFlight
              ? t('import-export.export.running', 'Exporting...')
              : t('import-export.export.run', 'Export')}
          </button>
        </div>

        {exportResult?.success && (
          <div className="ImportExportSettings__successBox">
            {t('import-export.export.done', 'Saved to')}&nbsp;
            <code>{exportResult.path}</code>
          </div>
        )}
        {exportResult && !exportResult.success && (
          <div className="ImportExportSettings__errorBox" role="alert">
            {t('import-export.export.failed', 'Export failed')}:{' '}
            {exportResult.error}
          </div>
        )}
      </details>

      <details className="ImportExportSettings__card" open={openImportFromNav}>
        <summary>
          <span className="ImportExportSettings__cardTitle">
            <UploadFileIcon />
            {t('import-export.import.title', 'Import a Heroic backup')}
          </span>
        </summary>
        <p className="ImportExportSettings__hint">
          {t(
            'import-export.import.hint',
            'Start a step-by-step wizard to preview and apply a previously exported Heroic backup.'
          )}
        </p>
        <div className="ImportExportSettings__importRow">
          <button
            type="button"
            className="button is-primary"
            onClick={() => setWizardOpen(true)}
          >
            {t('import-export.import.open', 'Open import wizard')}
          </button>

          {rollbackSnapshot && (
            <div className="ImportExportSettings__rollback">
              <p className="ImportExportSettings__hint">
                {t(
                  'import-export.rollback.hint',
                  'A rollback snapshot was saved during the last import. Use this button to revert to that state.'
                )}
              </p>
              <button
                type="button"
                className="button is-tertiary"
                onClick={runRollback}
                disabled={rollbackInFlight}
              >
                <RestoreIcon fontSize="small" />
                &nbsp;
                {rollbackInFlight
                  ? t('import-export.rollback.running', 'Rolling back...')
                  : t('import-export.rollback.run', 'Rollback last import')}
              </button>
              <div className="ImportExportSettings__rollbackMeta">
                {t('import-export.rollback.saved', 'Saved')}{' '}
                {new Date(rollbackSnapshot.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {rollbackResult?.ok && (
          <div className="ImportExportSettings__successBox">
            {t(
              'import-export.rollback.done',
              'Rollback applied. Restart Heroic to apply all changes.'
            )}
          </div>
        )}
        {rollbackResult && !rollbackResult.ok && (
          <div className="ImportExportSettings__errorBox" role="alert">
            {t('import-export.rollback.failed', 'Rollback failed')}:{' '}
            {rollbackResult.errors.join(', ')}
          </div>
        )}
      </details>

      <ImportExportWizard
        open={wizardOpen}
        onClose={async () => {
          setWizardOpen(false)
          await refreshRollback()
        }}
      />
    </div>
  )
}
