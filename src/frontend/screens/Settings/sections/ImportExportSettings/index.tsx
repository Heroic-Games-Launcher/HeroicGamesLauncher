import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, RotateCcw, Upload } from 'lucide-react'

import {
  Alert,
  Button,
  Icon,
  PathSelectionBox,
  SettingRow,
  SettingsCard
} from 'frontend/components/UI'
import Checkbox from 'frontend/components/UI/Checkbox'
import ImportExportWizard from 'frontend/components/UI/ImportExportWizard'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  ALL_STAGES,
  stageLabels,
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
  const { showDialogModal } = useContext(ContextProvider)
  const location = useLocation()
  const navigate = useNavigate()
  const [openImportFromNav] = useState(() =>
    Boolean((location.state as ImportExportNavState | null)?.openImport)
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
    refreshRollback().catch(() => null)
    window.api
      .getHomeDir()
      .then((home) => setOutputDir(home))
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (openImportFromNav) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [openImportFromNav, navigate, location.pathname])

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

  async function runExport() {
    if (!outputDir) return
    setExportInFlight(true)
    setExportResult(null)
    try {
      const sep = outputDir.includes('\\') ? '\\' : '/'
      const dir = outputDir.endsWith(sep) ? outputDir.slice(0, -1) : outputDir
      const finalPath = `${dir}${sep}${outputName}`
      const result = await window.api.exportHeroicBackup({
        outputPath: finalPath,
        stages: Array.from(selectedStages)
      })
      setExportResult(result)
      // Refresh the auto-generated filename for the next export
      setOutputName(timestampedBackupName())
    } catch (err) {
      setExportResult({ success: false, error: String(err) })
    } finally {
      setExportInFlight(false)
    }
  }

  function confirmRollback() {
    showDialogModal({
      showDialog: true,
      title: t('import-export.rollback.confirm-title', 'Rollback last import?'),
      message: t(
        'import-export.rollback.confirm-message',
        'This will revert settings, logins and library changes made by the last import. This cannot be undone.'
      ),
      buttons: [
        {
          text: t('box.yes'),
          onClick: () => {
            void runRollback()
          }
        },
        { text: t('box.no'), onClick: () => null }
      ],
      type: 'MESSAGE'
    })
  }

  async function runRollback() {
    setRollbackInFlight(true)
    setRollbackResult(null)
    try {
      const result = await window.api.rollbackHeroicBackup()
      setRollbackResult(result)
      if (result.ok) setRollbackSnapshot(null)
    } catch (err) {
      setRollbackResult({
        ok: false,
        stages: [],
        gamesQueuedForDownload: [],
        wineVersionsQueuedForDownload: [],
        warnings: [],
        errors: [String(err)]
      })
    } finally {
      setRollbackInFlight(false)
    }
  }

  return (
    <div className="settingsSections">
      <SettingsCard
        glyph={Download}
        title={t('import-export.export.title', 'Export Heroic')}
        description={t(
          'import-export.export.hint',
          'Bundle Heroic settings, logins and library into a single zip file you can restore later or move to another machine.'
        )}
        meta={t(
          'import-export.export.summary',
          '{{count}} of {{total}} included',
          {
            count: selectedStages.size,
            total: ALL_STAGES.length
          }
        )}
      >
        {ALL_STAGES.map((stage) => (
          <SettingRow
            key={stage}
            label={stageLabels(t)[stage]}
            htmlFor={`ie-export-${stage}`}
          >
            <Checkbox
              inputProps={{ id: `ie-export-${stage}` }}
              checked={selectedStages.has(stage)}
              onChange={() => toggleStage(stage)}
            />
          </SettingRow>
        ))}

        <PathSelectionBox
          htmlId="ie-export-dir"
          type="directory"
          label={t('import-export.export.output', 'Output folder')}
          path={outputDir}
          onPathChange={setOutputDir}
          pathDialogTitle={t(
            'import-export.export.pickDir',
            'Choose where to save the backup'
          )}
          pathDialogDefaultPath={outputDir}
          placeholder={t(
            'import-export.export.output-placeholder',
            'Pick a folder...'
          )}
          noDeleteButton
        />

        <SettingRow
          label={t('import-export.export.filename', 'Filename')}
          description={outputName}
        >
          <Button
            variant="primary"
            disabled={exportInFlight || selectedStages.size === 0 || !outputDir}
            onClick={runExport}
          >
            {exportInFlight
              ? t('import-export.export.running', 'Exporting...')
              : t('import-export.export.run', 'Export')}
          </Button>
        </SettingRow>

        {exportResult?.success && (
          <Alert variant="success">
            {t('import-export.export.done', 'Saved to')}&nbsp;
            <code>{exportResult.path}</code>
          </Alert>
        )}
        {exportResult && !exportResult.success && (
          <Alert variant="error">
            {t('import-export.export.failed', 'Export failed')}:{' '}
            {exportResult.error}
          </Alert>
        )}
      </SettingsCard>

      <SettingsCard
        glyph={Upload}
        title={t('import-export.import.title', 'Import a Heroic backup')}
      >
        <SettingRow
          label={t('import-export.import.row', 'Restore from a backup file')}
          description={t(
            'import-export.import.hint',
            'Start a step-by-step wizard to preview and apply a previously exported Heroic backup.'
          )}
        >
          <Button variant="primary" onClick={() => setWizardOpen(true)}>
            {t('import-export.import.open', 'Open import wizard')}
          </Button>
        </SettingRow>

        {rollbackSnapshot && (
          <SettingRow
            label={t('import-export.rollback.run', 'Rollback last import')}
            description={
              <>
                {t(
                  'import-export.rollback.hint',
                  'A rollback snapshot was saved during the last import. Use this button to revert to that state.'
                )}
                <span className="fieldCaption">
                  <span className="fieldCaption__label">
                    {t('import-export.rollback.saved', 'Saved')}
                  </span>
                  <span className="fieldCaption__value">
                    {new Date(rollbackSnapshot.createdAt).toLocaleString()}
                  </span>
                </span>
              </>
            }
          >
            <Button
              variant="dangerSubtle"
              icon={<Icon glyph={RotateCcw} size="md" />}
              onClick={confirmRollback}
              disabled={rollbackInFlight}
            >
              {rollbackInFlight
                ? t('import-export.rollback.running', 'Rolling back...')
                : t('import-export.rollback.run', 'Rollback last import')}
            </Button>
          </SettingRow>
        )}

        {rollbackResult?.ok && (
          <Alert variant="success">
            {t(
              'import-export.rollback.done',
              'Rollback applied. Restart Heroic to apply all changes.'
            )}
          </Alert>
        )}
        {rollbackResult && !rollbackResult.ok && (
          <Alert variant="error">
            {t('import-export.rollback.failed', 'Rollback failed')}:{' '}
            {rollbackResult.errors.join(', ')}
          </Alert>
        )}
      </SettingsCard>

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
