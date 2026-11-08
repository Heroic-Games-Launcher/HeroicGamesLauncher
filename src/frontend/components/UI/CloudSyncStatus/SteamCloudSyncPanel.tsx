import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Cloud,
  CloudAlert,
  CloudCheck,
  CloudDownload,
  CloudOff,
  CloudUpload,
  FolderOpen,
  RefreshCw
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import Alert from '../Alert'
import type { AlertVariant } from '../Alert'
import Badge from '../Badge'
import Button from '../Button'
import EmptyState from '../EmptyState'
import Icon from '../Icon'
import SettingRow from '../SettingRow'
import SettingsCard from '../SettingsCard'
import Table from '../Table'
import type { TableColumn } from '../Table'
import type {
  SteamCloudFile,
  SteamCloudSyncDirection,
  SteamCloudSyncState,
  SteamCloudSyncStatus
} from 'common/types/steam'

import { useCloudSyncStateLabels } from './state'
import './index.css'

interface Props {
  appName: string
  status: SteamCloudSyncStatus
  // Lets a host retitle on file view
  onShowFilesChange?: (showFiles: boolean) => void
}

/** Formats a byte count for the file list. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

/** Ascending, so the last match is the largest unit that still fits. */
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 1000],
  ['minute', 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['year', 365 * 24 * 60 * 60 * 1000]
]

function formatRelative(when: number, language: string): string {
  const difference = when - Date.now()
  const magnitude = Math.abs(difference)

  let unit: Intl.RelativeTimeFormatUnit = 'second'
  let unitMs = 1000
  for (const [candidate, candidateMs] of RELATIVE_UNITS) {
    if (magnitude < candidateMs) break
    unit = candidate
    unitMs = candidateMs
  }

  return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(
    Math.round(difference / unitMs),
    unit
  )
}

/** Alert tone and glyph per state. */
const STATE_ALERT: Record<
  SteamCloudSyncState,
  { variant: AlertVariant; glyph: LucideIcon }
> = {
  unknown: { variant: 'neutral', glyph: Cloud },
  ok: { variant: 'success', glyph: CloudCheck },
  syncing: { variant: 'info', glyph: RefreshCw },
  conflicts: { variant: 'error', glyph: CloudAlert },
  incomplete: { variant: 'warning', glyph: CloudAlert },
  failed: { variant: 'error', glyph: CloudOff }
}

interface ActionProps {
  glyph: LucideIcon
  label: string
  /** Second line: the timestamp or size context for this action. */
  hint?: string
  button: string
  primary?: boolean
  disabled?: boolean
  onClick: () => void
}

function CloudSyncAction({
  glyph,
  label,
  hint,
  button,
  primary,
  disabled,
  onClick
}: ActionProps) {
  return (
    <SettingRow label={label} description={hint}>
      <Button
        variant={primary ? 'primary' : 'secondary'}
        size="sm"
        className="cloudSyncActionButton"
        icon={<Icon glyph={glyph} size="sm" />}
        disabled={disabled}
        onClick={onClick}
      >
        {button}
      </Button>
    </SettingRow>
  )
}

/**
 * Steam Cloud status, sync actions and file list, shared by the game-page
 * dialog and the per-game Cloud Saves settings tab.
 */
export default function SteamCloudSyncPanel({
  appName,
  status,
  onShowFilesChange
}: Props) {
  const { t, i18n } = useTranslation()
  const stateLabels = useCloudSyncStateLabels()

  const [current, setCurrent] = useState(status)
  const [busy, setBusy] = useState(false)
  const [files, setFiles] = useState<SteamCloudFile[] | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [showFiles, setShowFilesState] = useState(false)
  const setShowFiles = useCallback(
    (show: boolean) => {
      setShowFilesState(show)
      onShowFilesChange?.(show)
    },
    [onShowFilesChange]
  )

  // Keep in step with syncs triggered elsewhere.
  useEffect(() => setCurrent(status), [status])

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true)
    try {
      setFiles(await window.api.listSteamCloudFiles(appName))
    } finally {
      setLoadingFiles(false)
    }
  }, [appName])

  // The listing also feeds the timestamps on the buttons, so fetch it up front.
  useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  const runSync = useCallback(
    async (direction: SteamCloudSyncDirection) => {
      setBusy(true)
      try {
        setCurrent(await window.api.runSteamCloudSync(appName, direction))
      } finally {
        setBusy(false)
      }
      await loadFiles()
    },
    [appName, loadFiles]
  )

  const resolve = useCallback(
    async (side: 'cloud' | 'local') => {
      setBusy(true)
      try {
        setCurrent(await window.api.resolveSteamCloudSync(appName, side))
      } finally {
        setBusy(false)
      }
      await loadFiles()
    },
    [appName, loadFiles]
  )

  // Newest first
  const sortedFiles = useMemo(
    () => (files ? [...files].sort((a, b) => b.timestamp - a.timestamp) : null),
    [files]
  )

  const cloudStats = useMemo(() => {
    if (!files?.length) return null
    return {
      count: files.length,
      size: files.reduce((total, file) => total + file.size, 0),
      // Aurelia reports seconds, `Date` wants milliseconds.
      newest: Math.max(...files.map((file) => file.timestamp)) * 1000
    }
  }, [files])

  const language = i18n.language
  const hasIssue =
    current.state === 'conflicts' ||
    current.state === 'failed' ||
    current.state === 'incomplete'

  const lastSyncExact = current.lastSync
    ? new Date(current.lastSync).toLocaleString()
    : undefined
  const lastSyncLabel = current.lastSync
    ? formatRelative(current.lastSync, language)
    : t('cloudSync.never', 'Never')

  const cloudAge = cloudStats
    ? formatRelative(cloudStats.newest, language)
    : undefined
  const stillChecking = loadingFiles && !files

  const checkingHint = t('cloudSync.hint.checking', 'Checking Steam Cloud…')
  const cloudEmptyHint = t(
    'cloudSync.hint.cloudEmpty',
    'Nothing in Steam Cloud yet'
  )

  const cloudCopyHint = cloudAge
    ? t('cloudSync.hint.cloudCopy', 'Cloud copy from {{when}}', {
        when: cloudAge
      })
    : stillChecking
      ? checkingHint
      : cloudEmptyHint

  const replaceCloudHint = cloudAge
    ? t(
        'cloudSync.hint.replaceCloud',
        'Replaces the Cloud copy from {{when}}',
        {
          when: cloudAge
        }
      )
    : stillChecking
      ? checkingHint
      : t('cloudSync.hint.firstUpload', 'Creates the first Cloud copy')

  const discardCloudHint = cloudAge
    ? t(
        'cloudSync.hint.discardCloud',
        'Discards the Cloud copy from {{when}}',
        {
          when: cloudAge
        }
      )
    : stillChecking
      ? checkingHint
      : cloudEmptyHint

  const fileCountHint = cloudStats
    ? t('cloudSync.hint.fileCount', '{{count}} files · {{size}}', {
        count: cloudStats.count,
        size: formatSize(cloudStats.size)
      })
    : stillChecking
      ? checkingHint
      : cloudEmptyHint

  const stateAlert = STATE_ALERT[current.state]

  const fileColumns: TableColumn<SteamCloudFile>[] = [
    {
      key: 'name',
      header: t('cloudSync.column.file', 'File'),
      render: (file) => (
        <span className="cloudSyncFileName">{file.filename}</span>
      )
    },
    {
      key: 'size',
      header: t('cloudSync.column.size', 'Size'),
      align: 'end',
      render: (file) => formatSize(file.size)
    },
    {
      key: 'modified',
      header: t('cloudSync.column.modified', 'Modified'),
      align: 'end',
      render: (file) => (
        <span title={new Date(file.timestamp * 1000).toLocaleString()}>
          {formatRelative(file.timestamp * 1000, language)}
        </span>
      )
    }
  ]

  return (
    <div className="cloudSyncPanel">
      {showFiles ? (
        <>
          <SettingsCard
            glyph={FolderOpen}
            title={t('cloudSync.section.files', 'Cloud files')}
            meta={fileCountHint}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon glyph={ArrowLeft} size="sm" />}
                onClick={() => setShowFiles(false)}
              >
                {t('cloudSync.back', 'Back')}
              </Button>
            }
          >
            <Table
              className="cloudSyncFileTable"
              density="compact"
              columns={fileColumns}
              rows={sortedFiles ?? []}
              rowKey={(file) => file.filename}
              loading={loadingFiles}
              loadingRows={4}
              empty={
                <EmptyState
                  glyph={Cloud}
                  title={t(
                    'cloudSync.noFiles',
                    'No files in Steam Cloud for this game.'
                  )}
                />
              }
            />
          </SettingsCard>
        </>
      ) : (
        <>
          <Alert
            variant={stateAlert.variant}
            glyph={stateAlert.glyph}
            title={stateLabels[current.state]}
            className={`cloudSyncSummary state-${current.state}`}
          >
            <span title={lastSyncExact}>
              {t('cloudSync.lastSync', 'Last sync: {{when}}', {
                when: lastSyncLabel
              })}
            </span>
            {hasIssue && (
              <span className="cloudSyncIssueText">
                {current.message ??
                  t('cloudSync.genericIssue', 'The last sync had a problem.')}
              </span>
            )}
            {!!(current.conflicts || current.failed || current.skipped) && (
              <span className="cloudSyncCounts">
                {!!current.conflicts && (
                  <Badge variant="error">
                    {t('cloudSync.count.conflicts', '{{count}} conflicting', {
                      count: current.conflicts
                    })}
                  </Badge>
                )}
                {!!current.failed && (
                  <Badge variant="error">
                    {t('cloudSync.count.failed', '{{count}} failed', {
                      count: current.failed
                    })}
                  </Badge>
                )}
                {!!current.skipped && (
                  <Badge variant="warning">
                    {t('cloudSync.count.skipped', '{{count}} skipped', {
                      count: current.skipped
                    })}
                  </Badge>
                )}
              </span>
            )}
          </Alert>

          <SettingsCard
            className="cloudSyncActions"
            glyph={Cloud}
            title={t('cloudSync.section.actions', 'Sync actions')}
          >
            {current.state === 'conflicts' && (
              <>
                <CloudSyncAction
                  primary
                  glyph={CloudDownload}
                  label={t(
                    'cloudSync.keepCloud',
                    'Resolve: keep Steam Cloud saves'
                  )}
                  hint={cloudCopyHint}
                  button={t('cloudSync.button.keep', 'Keep')}
                  disabled={busy}
                  onClick={() => resolve('cloud')}
                />
                <CloudSyncAction
                  primary
                  glyph={CloudUpload}
                  label={t(
                    'cloudSync.keepLocal',
                    "Resolve: keep this PC's saves"
                  )}
                  hint={discardCloudHint}
                  button={t('cloudSync.button.keep', 'Keep')}
                  disabled={busy}
                  onClick={() => resolve('local')}
                />
              </>
            )}

            <CloudSyncAction
              glyph={CloudDownload}
              label={t('cloudSync.pull', 'Download saves from Cloud')}
              hint={cloudCopyHint}
              button={t('cloudSync.button.download', 'Download')}
              disabled={busy}
              onClick={() => runSync('down')}
            />
            <CloudSyncAction
              glyph={CloudUpload}
              label={t('cloudSync.push', 'Upload local saves to Cloud')}
              hint={replaceCloudHint}
              button={t('cloudSync.button.upload', 'Upload')}
              disabled={busy}
              onClick={() => runSync('up')}
            />
            <CloudSyncAction
              glyph={RefreshCw}
              label={t('cloudSync.sync', 'Sync now (both ways)')}
              hint={
                current.lastSync
                  ? t('cloudSync.hint.lastSync', 'Last synced {{when}}', {
                      when: lastSyncLabel
                    })
                  : t(
                      'cloudSync.hint.neverSynced',
                      'Not synced from Heroic yet'
                    )
              }
              button={t('cloudSync.button.sync', 'Sync')}
              disabled={busy}
              onClick={() => runSync('both')}
            />
            <CloudSyncAction
              glyph={FolderOpen}
              label={t('cloudSync.viewFiles', 'View Cloud save files')}
              hint={fileCountHint}
              button={t('cloudSync.button.view', 'View')}
              disabled={busy}
              onClick={() => setShowFiles(true)}
            />
          </SettingsCard>

          {busy && (
            <p className="cloudSyncBusy">
              <Icon glyph={RefreshCw} size="sm" className="lucide-spin" />
              {t('cloudSync.syncing', 'Syncing… please wait.')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
