import { useTranslation } from 'react-i18next'
import {
  CloudDone,
  CloudOff,
  CloudQueue,
  Sync,
  SyncProblem
} from '@mui/icons-material'

import type { SteamCloudSyncState } from 'common/types/steam'

/** Icon shown for each sync outcome, in the library and in the modal. */
export const CLOUD_SYNC_ICONS: Record<SteamCloudSyncState, typeof CloudQueue> =
  {
    unknown: CloudQueue,
    ok: CloudDone,
    // A plain circling arrow — a spinning cloud reads as odd.
    syncing: Sync,
    conflicts: SyncProblem,
    incomplete: SyncProblem,
    failed: CloudOff
  }

/** States that warrant the attention dot. */
export function issueLevel(
  state: SteamCloudSyncState
): 'none' | 'warning' | 'error' {
  if (state === 'conflicts' || state === 'failed') return 'error'
  if (state === 'incomplete') return 'warning'
  return 'none'
}

/** One human-readable line per state, used as tooltip and modal heading. */
export function useCloudSyncStateLabels(): Record<SteamCloudSyncState, string> {
  const { t } = useTranslation()
  return {
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
}
