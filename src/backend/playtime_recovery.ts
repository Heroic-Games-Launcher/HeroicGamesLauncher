import { activeSessionsStore, tsStore } from './constants/key_value_stores'
import { libraryManagerMap } from './storeManagers'
import { logError, logInfo, LogPrefix } from './logger'

/// Recovers playtime in the event of any crash(es)
export async function recoverOrphanedSessions(): Promise<void> {
  const orphans = activeSessionsStore.raw_store
  const entries = Object.entries(orphans)
  if (entries.length === 0) return

  logInfo(
    `[Playtime] Recovering ${entries.length} orphaned session(s) from previous run`,
    LogPrefix.Backend
  )

  for (const [appName, state] of entries) {
    try {
      const startedAt = new Date(state.startedAt)
      const wallMs = Date.parse(state.checkpointAt) - startedAt.getTime()
      const activeMs = Math.max(0, wallMs - state.totalSuspendMs)
      const minutes = activeMs / 60000

      tsStore.set(`${appName}.lastPlayed`, state.checkpointAt)
      const totalPlaytime = minutes + tsStore.get(`${appName}.totalPlayed`, 0)
      tsStore.set(`${appName}.totalPlayed`, Math.floor(totalPlaytime))

      logInfo(
        `[Playtime] Recovered ${state.title || appName}: ${Math.floor(
          minutes
        )}m (checkpoint ${state.checkpointAt})`,
        LogPrefix.Backend
      )

      if (state.runner === 'gog' && minutes >= 1) {
        try {
          await libraryManagerMap['gog']
            .getGame(appName)
            .updateGOGPlaytime(startedAt, minutes)
        } catch (e) {
          logError(
            `[Playtime] Failed to enqueue orphaned GOG session for ${appName}: ${e}`,
            LogPrefix.Gog
          )
        }
      }
    } catch (e) {
      logError(
        `[Playtime] Failed to finalize orphaned session for ${appName}: ${e}`,
        LogPrefix.Backend
      )
    } finally {
      activeSessionsStore.delete(appName)
    }
  }
}
