import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowBack,
  Autorenew,
  CloudDownload,
  CloudUpload,
  FolderOpen,
  Sync
} from '@mui/icons-material'

import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import type { GameHandle } from 'frontend/helpers/ipc'
import type {
  SteamCloudFile,
  SteamCloudSyncDirection,
  SteamCloudSyncStatus
} from 'common/types/steam'

import { CLOUD_SYNC_ICONS, useCloudSyncStateLabels } from './state'
import './index.css'

interface Props {
  game: GameHandle
  title: string
  status: SteamCloudSyncStatus
  onClose: () => void
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

/** "2 hours ago" — timestamps are more readable as an age than as a date. */
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

interface ActionProps {
  icon: ReactNode
  label: string
  /** Second line: the timestamp or size context for this action. */
  hint?: string
  primary?: boolean
  disabled?: boolean
  onClick: () => void
}

function CloudSyncAction({
  icon,
  label,
  hint,
  primary,
  disabled,
  onClick
}: ActionProps) {
  return (
    <button
      type="button"
      className={`button cloudSyncAction ${
        primary ? 'is-primary' : 'is-secondary'
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="cloudSyncActionText">
        <span className="cloudSyncActionLabel">{label}</span>
        {hint && <span className="cloudSyncActionHint">{hint}</span>}
      </span>
    </button>
  )
}

export default function CloudSyncModal({
  game,
  title,
  status,
  onClose
}: Props) {
  const { t, i18n } = useTranslation()
  const stateLabels = useCloudSyncStateLabels()

  const [current, setCurrent] = useState(status)
  const [busy, setBusy] = useState(false)
  const [files, setFiles] = useState<SteamCloudFile[] | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [showFiles, setShowFiles] = useState(false)

  // Keep in step with syncs triggered elsewhere.
  useEffect(() => setCurrent(status), [status])

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true)
    try {
      setFiles(await window.api.listSteamCloudFiles(game))
    } finally {
      setLoadingFiles(false)
    }
  }, [game])

  // The listing also feeds the timestamps on the buttons, so fetch it up front.
  useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  const runSync = useCallback(
    async (direction: SteamCloudSyncDirection) => {
      setBusy(true)
      try {
        setCurrent(await window.api.runSteamCloudSync(game, direction))
      } finally {
        setBusy(false)
      }
      await loadFiles()
    },
    [game, loadFiles]
  )

  const resolve = useCallback(
    async (side: 'cloud' | 'local') => {
      setBusy(true)
      try {
        setCurrent(await window.api.resolveSteamCloudSync(game, side))
      } finally {
        setBusy(false)
      }
      await loadFiles()
    },
    [game, loadFiles]
  )

  /** Newest first — the most recent save is what people look for. */
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

  // Age of the newest Cloud file — what every Cloud-side action acts on.
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

  const StateIcon = CLOUD_SYNC_ICONS[current.state]

  return (
    <Dialog showCloseButton onClose={onClose} className="cloudSyncModal">
      <DialogHeader onClose={onClose}>
        {showFiles
          ? t('cloudSync.filesTitle', 'Steam Cloud files — {{game}}', {
              game: title
            })
          : t('cloudSync.title', 'Steam Cloud saves — {{game}}', {
              game: title
            })}
      </DialogHeader>
      <DialogContent>
        {showFiles ? (
          <>
            <p className="cloudSyncMeta">{fileCountHint}</p>

            {loadingFiles && (
              <p className="cloudSyncEmpty">
                {t('cloudSync.loadingFiles', 'Loading Cloud files…')}
              </p>
            )}
            {!loadingFiles && !sortedFiles?.length && (
              <p className="cloudSyncEmpty">
                {t(
                  'cloudSync.noFiles',
                  'No files in Steam Cloud for this game.'
                )}
              </p>
            )}
            {!loadingFiles && !!sortedFiles?.length && (
              <ul className="cloudSyncFileList">
                {sortedFiles.map((file) => (
                  <li className="cloudSyncFile" key={file.filename}>
                    <span className="cloudSyncFileName">{file.filename}</span>
                    <span className="cloudSyncFileMeta">
                      {formatSize(file.size)}
                    </span>
                    <span
                      className="cloudSyncFileMeta"
                      title={new Date(file.timestamp * 1000).toLocaleString()}
                    >
                      {formatRelative(file.timestamp * 1000, language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="cloudSyncActions">
              <CloudSyncAction
                icon={<ArrowBack />}
                label={t('cloudSync.back', 'Back')}
                onClick={() => setShowFiles(false)}
              />
            </div>
          </>
        ) : (
          <>
            <div className={`cloudSyncSummary state-${current.state}`}>
              <StateIcon className="cloudSyncSummaryIcon" />
              <span className="cloudSyncSummaryText">
                <span className="cloudSyncSummaryState">
                  {stateLabels[current.state]}
                </span>
                <span className="cloudSyncSummaryMeta" title={lastSyncExact}>
                  {t('cloudSync.lastSync', 'Last sync: {{when}}', {
                    when: lastSyncLabel
                  })}
                </span>
              </span>
            </div>

            {!!(current.conflicts || current.failed || current.skipped) && (
              <ul className="cloudSyncCounts">
                {!!current.conflicts && (
                  <li className="cloudSyncCount error">
                    {t('cloudSync.count.conflicts', '{{count}} conflicting', {
                      count: current.conflicts
                    })}
                  </li>
                )}
                {!!current.failed && (
                  <li className="cloudSyncCount error">
                    {t('cloudSync.count.failed', '{{count}} failed', {
                      count: current.failed
                    })}
                  </li>
                )}
                {!!current.skipped && (
                  <li className="cloudSyncCount warning">
                    {t('cloudSync.count.skipped', '{{count}} skipped', {
                      count: current.skipped
                    })}
                  </li>
                )}
              </ul>
            )}

            {hasIssue && (
              <div
                className={`cloudSyncIssue${
                  current.state === 'incomplete' ? ' warning' : ''
                }`}
              >
                <p className="cloudSyncIssueText">
                  {current.message ??
                    t('cloudSync.genericIssue', 'The last sync had a problem.')}
                </p>
              </div>
            )}

            <div className="cloudSyncActions">
              {current.state === 'conflicts' && (
                <>
                  <CloudSyncAction
                    primary
                    icon={<CloudDownload />}
                    label={t(
                      'cloudSync.keepCloud',
                      'Resolve: keep Steam Cloud saves'
                    )}
                    hint={cloudCopyHint}
                    disabled={busy}
                    onClick={() => resolve('cloud')}
                  />
                  <CloudSyncAction
                    primary
                    icon={<CloudUpload />}
                    label={t(
                      'cloudSync.keepLocal',
                      "Resolve: keep this PC's saves"
                    )}
                    hint={discardCloudHint}
                    disabled={busy}
                    onClick={() => resolve('local')}
                  />
                </>
              )}

              <CloudSyncAction
                icon={<CloudDownload />}
                label={t('cloudSync.pull', 'Download saves from Cloud')}
                hint={cloudCopyHint}
                disabled={busy}
                onClick={() => runSync('down')}
              />
              <CloudSyncAction
                icon={<CloudUpload />}
                label={t('cloudSync.push', 'Upload local saves to Cloud')}
                hint={replaceCloudHint}
                disabled={busy}
                onClick={() => runSync('up')}
              />
              <CloudSyncAction
                icon={<Sync />}
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
                disabled={busy}
                onClick={() => runSync('both')}
              />
              <CloudSyncAction
                icon={<FolderOpen />}
                label={t('cloudSync.viewFiles', 'View Cloud save files')}
                hint={fileCountHint}
                disabled={busy}
                onClick={() => setShowFiles(true)}
              />
            </div>

            {busy && (
              <p className="cloudSyncBusy">
                <Autorenew className="cloudSyncBusyIcon" />
                {t('cloudSync.syncing', 'Syncing… please wait.')}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
