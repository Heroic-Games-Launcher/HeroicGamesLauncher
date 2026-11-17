import { sendFrontendMessage } from 'backend/ipc'
import type {
  SteamCloudSyncState,
  SteamCloudSyncStatus
} from 'common/types/steam'
import { configStore } from './electronStores'
import type { AureliaCloudSyncResponse } from './aurelia_types'

/**
 * Tracks the outcome of the last Steam Cloud sync per game so the library can
 * render a sync-state icon without re-running a sync just to find out.
 *
 * The record is written by every sync path (launch-time sync, user-initiated
 * sync from the UI, and `syncSaves`) and read by the frontend over IPC. Changes
 * are pushed to the renderer so open views update without polling.
 */

function readAll(): Record<string, SteamCloudSyncStatus> {
  return configStore.get('cloudSync', {})
}

export function getCloudSyncStatus(appId: string): SteamCloudSyncStatus {
  return readAll()[appId] ?? { appId, state: 'unknown' }
}

function writeStatus(status: SteamCloudSyncStatus): SteamCloudSyncStatus {
  const all = readAll()
  all[status.appId] = status
  configStore.set('cloudSync', all)
  sendFrontendMessage('steamCloudSyncStatusChanged', status)
  return status
}

/** Flags a sync as in-flight so the UI can show a spinner. */
export function markCloudSyncing(appId: string): SteamCloudSyncStatus {
  // Keep `lastSync` so the UI can still show when it last succeeded.
  const { lastSync } = getCloudSyncStatus(appId)
  return writeStatus({ appId, state: 'syncing', lastSync })
}

/**
 * Turns an Aurelia sync response into a user-facing summary.
 *
 * A response is only `ok` when nothing conflicted, failed, or was skipped —
 * Aurelia reports partial success rather than throwing, so we must inspect the
 * counts instead of trusting the absence of an error.
 */
function summariseCloudSync(result: AureliaCloudSyncResponse | undefined): {
  state: SteamCloudSyncState
  message?: string
  conflicts: number
  failed: number
  skipped: number
} {
  const conflicts = result?.conflicts?.length ?? 0
  const failed = result?.failed?.length ?? 0
  const skipped = result?.skipped?.length ?? 0

  if (!result) {
    return {
      state: 'failed',
      message: 'No response from Aurelia',
      conflicts,
      failed,
      skipped
    }
  }

  const details: string[] = []
  if (conflicts) {
    details.push(
      `${conflicts} file(s) diverged between the Cloud and this PC: ${result
        .conflicts!.slice(0, 3)
        .map((c) => c.filename)
        .join(', ')}`
    )
  }
  if (failed) {
    details.push(
      `${failed} file(s) failed to transfer: ${result
        .failed!.slice(0, 3)
        .map((f) => `${f.filename} (${f.error})`)
        .join('; ')}`
    )
  }
  if (skipped) {
    const tokens = result.skipped_root_tokens ?? []
    details.push(
      `${skipped} file(s) could not be placed on disk${
        tokens.length ? ` (unmapped root: ${tokens.join(', ')})` : ''
      }`
    )
  }

  const state: SteamCloudSyncState = conflicts
    ? 'conflicts'
    : failed
      ? 'failed'
      : skipped
        ? 'incomplete'
        : 'ok'

  return {
    state,
    message: details.length ? details.join('\n') : undefined,
    conflicts,
    failed,
    skipped
  }
}

/** Records the result of a completed sync attempt. */
export function recordCloudSyncResult(
  appId: string,
  result: AureliaCloudSyncResponse | undefined
): SteamCloudSyncStatus {
  const { state, message, conflicts, failed, skipped } =
    summariseCloudSync(result)
  return writeStatus({
    appId,
    state,
    lastSync: Date.now(),
    message,
    conflicts,
    failed,
    skipped
  })
}

/** Records a sync that threw before producing a result. */
export function recordCloudSyncError(
  appId: string,
  message: string
): SteamCloudSyncStatus {
  const { lastSync } = getCloudSyncStatus(appId)
  return writeStatus({ appId, state: 'failed', lastSync, message })
}
