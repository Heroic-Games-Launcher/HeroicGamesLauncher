import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloudDone,
  CloudOff,
  CloudQueue,
  CloudSync,
  SyncProblem
} from '@mui/icons-material'

import { GameHandle } from 'frontend/helpers/ipc'
import type { GameInfo } from 'common/types'
import type {
  SteamCloudSyncState,
  SteamCloudSyncStatus
} from 'common/types/steam'

import CloudSyncModal from './CloudSyncModal'
import './index.css'

interface Props {
  gameInfo: GameInfo
  className?: string
}

const ICONS: Record<SteamCloudSyncState, typeof CloudQueue> = {
  unknown: CloudQueue,
  ok: CloudDone,
  syncing: CloudSync,
  conflicts: SyncProblem,
  incomplete: SyncProblem,
  failed: CloudOff
}

/** States that warrant the attention dot. */
function issueLevel(state: SteamCloudSyncState): 'none' | 'warning' | 'error' {
  if (state === 'conflicts' || state === 'failed') return 'error'
  if (state === 'incomplete') return 'warning'
  return 'none'
}

/**
 * Steam Cloud sync indicator
 */
export default function CloudSyncStatus({ gameInfo, className }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<SteamCloudSyncStatus | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { app_name: appName, runner, title } = gameInfo
  const supported = runner === 'steam' && gameInfo.is_installed
  const game = useMemo(() => new GameHandle(appName, runner), [appName, runner])

  useEffect(() => {
    if (!supported) return
    let cancelled = false

    void window.api.getSteamCloudSyncStatus(game).then((result) => {
      if (!cancelled) setStatus(result)
    })

    // Pick up syncs triggered
    const removeListener = window.api.handleSteamCloudSyncStatusChanged(
      (incoming) => {
        if (!cancelled && incoming.appId === appName) {
          setStatus(incoming)
        }
      }
    )
    return () => {
      cancelled = true
      removeListener()
    }
  }, [supported, game, appName])

  const openModal = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setShowModal(true)
  }, [])

  if (!supported || !status) return null

  const Icon = ICONS[status.state]
  const level = issueLevel(status.state)

  const labels: Record<SteamCloudSyncState, string> = {
    unknown: t('cloudSync.state.unknown', 'Steam Cloud saves — not synced yet'),
    ok: t('cloudSync.state.ok', 'Steam Cloud saves are up to date'),
    syncing: t('cloudSync.state.syncing', 'Syncing Steam Cloud saves…'),
    conflicts: t(
      'cloudSync.state.conflicts',
      'Steam Cloud saves conflict with this PC'
    ),
    incomplete: t('cloudSync.state.incomplete', 'Steam Cloud sync incomplete'),
    failed: t('cloudSync.state.failed', 'Steam Cloud sync failed')
  }

  return (
    <>
      <button
        type="button"
        className={`cloudSyncStatusButton state-${status.state}${
          className ? ` ${className}` : ''
        }`}
        title={labels[status.state]}
        aria-label={labels[status.state]}
        onClick={openModal}
      >
        <Icon />
        {level !== 'none' && (
          <span
            className={`cloudSyncStatusDot${
              level === 'warning' ? ' warning' : ''
            }`}
          />
        )}
      </button>
      {showModal && (
        <CloudSyncModal
          game={game}
          title={title}
          status={status}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
