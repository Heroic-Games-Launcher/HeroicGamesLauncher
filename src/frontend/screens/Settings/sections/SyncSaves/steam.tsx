import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cloud } from 'lucide-react'
import type { SteamCloudSyncStatus } from 'common/types/steam'
import { EmptyState } from 'frontend/components/UI'
import SteamCloudSyncPanel from 'frontend/components/UI/CloudSyncStatus/SteamCloudSyncPanel'
import 'frontend/components/UI/CloudSyncStatus/index.css'

interface Props {
  appName: string
}

export default function SteamSyncSaves({ appName }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<SteamCloudSyncStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.api.getSteamCloudSyncStatus(appName).then((result) => {
      if (!cancelled) setStatus(result)
    })
    // Follow syncs started elsewhere
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
  }, [appName])

  if (!status) {
    return (
      <EmptyState
        glyph={Cloud}
        title={t('cloudSync.hint.checking', 'Checking Steam Cloud…')}
      />
    )
  }

  return <SteamCloudSyncPanel appName={appName} status={status} />
}
