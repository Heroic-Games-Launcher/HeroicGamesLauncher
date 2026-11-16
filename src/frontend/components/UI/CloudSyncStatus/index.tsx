import { useCallback, useEffect, useState } from 'react'

import type { GameInfo } from 'common/types'
import type { SteamCloudSyncStatus } from 'common/types/steam'

import useGlobalState from 'frontend/state/GlobalStateV2'
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
  const { openGameSettingsModal } = useGlobalState.keys('openGameSettingsModal')

  const { app_name: appName, runner } = gameInfo
  const supported = runner === 'steam' && gameInfo.is_installed

  useEffect(() => {
    if (!supported) return
    let cancelled = false

    void window.api.getSteamCloudSyncStatus(appName).then((result) => {
      if (!cancelled) setStatus(result)
    })

    // Pick up syncs triggered
    const removeListener = window.api.handleSteamCloudSyncStatusChanged(
      (_e, incoming) => {
        if (!cancelled && incoming.appId === appName) {
          setStatus(incoming)
        }
      }
    )
    return () => {
      cancelled = true
      removeListener()
    }
  }, [supported, appName])

  // Open settings on the saves tab
  const openSettings = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      openGameSettingsModal(gameInfo, 'saves')
    },
    [openGameSettingsModal, gameInfo]
  )

  if (!supported || !status) return null

  const Icon = CLOUD_SYNC_ICONS[status.state]
  const level = issueLevel(status.state)

  return (
    <button
      type="button"
      className={`cloudSyncStatusButton state-${status.state}${
        className ? ` ${className}` : ''
      }`}
      title={labels[status.state]}
      aria-label={labels[status.state]}
      onClick={openSettings}
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
  )
}
