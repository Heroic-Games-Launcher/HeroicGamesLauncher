import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameHandle } from 'frontend/helpers/ipc'
import type { SteamCloudSyncStatus } from 'common/types/steam'
import SteamCloudSyncPanel from 'frontend/components/UI/CloudSyncStatus/SteamCloudSyncPanel'
import 'frontend/components/UI/CloudSyncStatus/index.css'

interface Props {
  game: GameHandle
}

export default function SteamSyncSaves({ game }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<SteamCloudSyncStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.api.getSteamCloudSyncStatus(game).then((result) => {
      if (!cancelled) setStatus(result)
    })
    // Follow syncs started elsewhere
    const removeListener = window.api.handleSteamCloudSyncStatusChanged(
      (incoming) => {
        if (!cancelled && incoming.appId === game.id) {
          setStatus(incoming)
        }
      }
    )
    return () => {
      cancelled = true
      removeListener()
    }
  }, [game])

  if (!status) {
    return (
      <p className="cloudSyncEmpty">
        {t('cloudSync.hint.checking', 'Checking Steam Cloud…')}
      </p>
    )
  }

  return <SteamCloudSyncPanel game={game} status={status} />
}
