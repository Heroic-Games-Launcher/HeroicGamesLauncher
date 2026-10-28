import { logInfo, logWarning, LogPrefix } from 'backend/logger'
import { AureliaError, runAurelia } from './aurelia'
import type { AureliaInstallListEntry } from './aurelia_types'
import { describeError, isSteamImportEnabled } from './utils'

/** Backlog states (Aurelia v0.1.41+). */
const BACKLOG_STATES = new Set(['paused', 'aborted', 'interrupted'])

/** Retry while a stop winds down. */
const FORGET_RETRIES = 20
const FORGET_RETRY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Aurelia's unfinished installs, not running ones. */
export async function getSteamBacklog(): Promise<AureliaInstallListEntry[]> {
  if (!isSteamImportEnabled()) return []
  try {
    const entries = await runAurelia<AureliaInstallListEntry[]>([
      'install',
      'list'
    ])
    // Older Aurelia has no `state`.
    return Array.isArray(entries)
      ? entries.filter((e) => e.state && BACKLOG_STATES.has(e.state))
      : []
  } catch (error) {
    logWarning(
      ['Could not read the Steam install backlog', describeError(error)],
      LogPrefix.Steam
    )
    return []
  }
}

/** The backlog entry for `appId`, if any. */
export async function getSteamBacklogEntry(
  appId: string
): Promise<AureliaInstallListEntry | undefined> {
  return (await getSteamBacklog()).find((e) => String(e.app_id) === appId)
}

/** Forget `appId`, maybe with partial files. */
export async function forgetSteamInstall(
  appId: string,
  deleteFiles = false
): Promise<void> {
  if (!isSteamImportEnabled()) return
  const args = ['install', 'forget', appId, ...(deleteFiles ? ['-d'] : [])]
  for (let attempt = 0; attempt < FORGET_RETRIES; attempt++) {
    try {
      await runAurelia(args)
      logInfo(
        `Removed ${appId} from the Steam install backlog${
          deleteFiles ? ' with its partial files' : ''
        }`,
        LogPrefix.Steam
      )
      return
    } catch (error) {
      // Nothing to forget.
      if (error instanceof AureliaError && error.kind === 'not_found') return
      // Still stopping: retry shortly.
      if (/is downloading/i.test(describeError(error))) {
        await sleep(FORGET_RETRY_MS)
        continue
      }
      logWarning(
        [`Could not forget Steam install ${appId}`, describeError(error)],
        LogPrefix.Steam
      )
      return
    }
  }
  logWarning(
    `Steam install ${appId} kept downloading; left in the backlog`,
    LogPrefix.Steam
  )
}

/** Forget entries Heroic no longer queues. */
export async function pruneSteamBacklog(queued: Set<string>): Promise<void> {
  for (const entry of await getSteamBacklog()) {
    const appId = String(entry.app_id)
    if (!queued.has(appId)) {
      await forgetSteamInstall(appId)
    }
  }
}
