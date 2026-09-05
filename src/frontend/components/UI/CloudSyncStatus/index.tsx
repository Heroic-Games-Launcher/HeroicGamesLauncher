import { useCallback, useEffect, useMemo, useState } from 'react'

import { GameHandle } from 'frontend/helpers/ipc'
import type { GameInfo } from 'common/types'
import type { SteamCloudSyncStatus } from 'common/types/steam'

import CloudSyncModal from './CloudSyncModal'
import { CLOUD_SYNC_ICONS, issueLevel, useCloudSyncStateLabels } from './state'
import './index.css'

interface Props {
  gameInfo: GameInfo
  className?: string
}

/**
 * Steam Cloud sync indicator
 */
export default function CloudSyncStatus({ gameInfo, className }: Props) {
  const labels = useCloudSyncStateLabels()
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

  const Icon = CLOUD_SYNC_ICONS[status.state]
  const level = issueLevel(status.state)

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
