import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloudDownload,
  CloudUpload,
  FolderOpen,
  Sync,
  ArrowBack
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

export default function CloudSyncModal({
  game,
  title,
  status,
  onClose
}: Props) {
  const { t } = useTranslation()

  const [current, setCurrent] = useState(status)
  const [busy, setBusy] = useState(false)
  const [files, setFiles] = useState<SteamCloudFile[] | null>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)

  // Keep in step with syncs triggered elsewhere.
  useEffect(() => setCurrent(status), [status])

  const runSync = useCallback(
    async (direction: SteamCloudSyncDirection) => {
      setBusy(true)
      try {
        setCurrent(await window.api.runSteamCloudSync(game, direction))
      } finally {
        setBusy(false)
      }
    },
    [game]
  )

  const resolve = useCallback(
    async (side: 'cloud' | 'local') => {
      setBusy(true)
      try {
        setCurrent(await window.api.resolveSteamCloudSync(game, side))
      } finally {
        setBusy(false)
      }
    },
    [game]
  )

  const showFiles = useCallback(async () => {
    setLoadingFiles(true)
    setFiles([])
    try {
      setFiles(await window.api.listSteamCloudFiles(game))
    } finally {
      setLoadingFiles(false)
    }
  }, [game])

  const hasIssue =
    current.state === 'conflicts' ||
    current.state === 'failed' ||
    current.state === 'incomplete'

  const lastSyncLabel = current.lastSync
    ? new Date(current.lastSync).toLocaleString()
    : t('cloudSync.never', 'Never')

  return (
    <Dialog showCloseButton onClose={onClose} className="cloudSyncModal">
      <DialogHeader onClose={onClose}>
        {files
          ? t('cloudSync.filesTitle', 'Steam Cloud files — {{game}}', {
              game: title
            })
          : t('cloudSync.title', 'Steam Cloud saves — {{game}}', {
              game: title
            })}
      </DialogHeader>
      <DialogContent>
        {files ? (
          <>
            {loadingFiles && (
              <p className="cloudSyncEmpty">
                {t('cloudSync.loadingFiles', 'Loading Cloud files…')}
              </p>
            )}
            {!loadingFiles && files.length === 0 && (
              <p className="cloudSyncEmpty">
                {t(
                  'cloudSync.noFiles',
                  'No files in Steam Cloud for this game.'
                )}
              </p>
            )}
            {!loadingFiles && files.length > 0 && (
              <ul className="cloudSyncFileList">
                {files.map((file) => (
                  <li className="cloudSyncFile" key={file.filename}>
                    <span className="cloudSyncFileName">{file.filename}</span>
                    <span className="cloudSyncFileMeta">
                      {formatSize(file.size)}
                    </span>
                    <span className="cloudSyncFileMeta">
                      {new Date(file.timestamp * 1000).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="cloudSyncActions">
              <button
                className="button is-secondary"
                onClick={() => setFiles(null)}
              >
                <ArrowBack />
                {t('cloudSync.back', 'Back')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="cloudSyncMeta">
              {t('cloudSync.lastSync', 'Last sync: {{when}}', {
                when: lastSyncLabel
              })}
            </p>

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
                  <button
                    className="button is-primary"
                    disabled={busy}
                    onClick={() => resolve('cloud')}
                  >
                    <CloudDownload />
                    {t(
                      'cloudSync.keepCloud',
                      'Resolve: keep Steam Cloud saves'
                    )}
                  </button>
                  <button
                    className="button is-primary"
                    disabled={busy}
                    onClick={() => resolve('local')}
                  >
                    <CloudUpload />
                    {t('cloudSync.keepLocal', "Resolve: keep this PC's saves")}
                  </button>
                </>
              )}

              <button
                className="button is-secondary"
                disabled={busy}
                onClick={() => runSync('down')}
              >
                <CloudDownload />
                {t('cloudSync.pull', 'Download saves from Cloud')}
              </button>
              <button
                className="button is-secondary"
                disabled={busy}
                onClick={() => runSync('up')}
              >
                <CloudUpload />
                {t('cloudSync.push', 'Upload local saves to Cloud')}
              </button>
              <button
                className="button is-secondary"
                disabled={busy}
                onClick={() => runSync('both')}
              >
                <Sync />
                {t('cloudSync.sync', 'Sync now (both ways)')}
              </button>
              <button
                className="button is-secondary"
                disabled={busy}
                onClick={showFiles}
              >
                <FolderOpen />
                {t('cloudSync.viewFiles', 'View Cloud save files')}
              </button>
            </div>

            {busy && (
              <p className="cloudSyncMeta">
                {t('cloudSync.syncing', 'Syncing… please wait.')}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
