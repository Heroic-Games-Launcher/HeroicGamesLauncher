import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'
import { libraryManagerMap } from '..'
import {
  getSteamDownloadLimit,
  runAurelia,
  setSteamDownloadLimit
} from './aurelia'
import { describeError } from './utils'
import { logError, LogPrefix } from 'backend/logger'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addHandler('getSteamDlcInfo', async (_e, appName) =>
  libraryManagerMap['steam'].getDLCInfo(appName)
)

addHandler('getSteamInstallLibraries', async () =>
  libraryManagerMap['steam'].getInstallLibraries()
)

addHandler('getSteamDownloadLimit', async () => getSteamDownloadLimit())

addHandler('setSteamDownloadLimit', async (_e, kbit) =>
  setSteamDownloadLimit(kbit)
)

addHandler('getSteamCloudSyncStatus', (_e, appName) =>
  libraryManagerMap['steam'].getGame(appName).getCloudSyncStatus()
)

addHandler('runSteamCloudSync', async (_e, appName, direction) =>
  libraryManagerMap['steam'].getGame(appName).runCloudSync(direction)
)

addHandler('resolveSteamCloudSync', async (_e, appName, resolve) =>
  libraryManagerMap['steam'].getGame(appName).resolveCloudSync(resolve)
)

addHandler('listSteamCloudFiles', async (_e, appName) =>
  libraryManagerMap['steam'].getGame(appName).listCloudFiles()
)

addHandler('setSteamDlcEnabled', async (_e, dlcAppId, enabled) =>
  // setDlcEnabled operates on the DLC's app id, not a specific game instance.
  libraryManagerMap['steam'].getGame(dlcAppId).setDlcEnabled(dlcAppId, enabled)
)

addHandler('getSteamIntegrationEnabled', (_e, appName) =>
  libraryManagerMap['steam'].getGame(appName).getSteamIntegrationEnabled()
)

addHandler('getSteamLaunchTargets', async (_e, appName) =>
  libraryManagerMap['steam'].getGame(appName).getLaunchTargets()
)

addHandler('setSteamLaunchTarget', (_e, appName, targetId) =>
  libraryManagerMap['steam'].getGame(appName).setLaunchTarget(targetId)
)

// Opens the Windows Steam installer under Wine
addHandler('installSteamWineRuntime', async () => {
  try {
    await runAurelia(['steam-runtime', 'install'])
    return { status: 'done' as const }
  } catch (error) {
    logError(
      ['Failed to install the in-Wine Steam runtime', describeError(error)],
      LogPrefix.Steam
    )
    return { status: 'error' as const, error: describeError(error) }
  }
})

addListener('setSteamIntegrationEnabled', (_e, appName, enabled) => {
  libraryManagerMap['steam']
    .getGame(appName)
    .setSteamIntegrationEnabled(enabled)
})

addListener('logoutSteamAccount', (_e, steamId) => {
  void SteamUser.logoutAccount(steamId)
})
