import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'
import { libraryManagerMap } from '..'
import { runAurelia } from './aurelia'
import { describeError } from './utils'
import { logError, LogPrefix } from 'backend/logger'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addHandler('getSteamDlcInfo', async (_e, game) =>
  libraryManagerMap['steam'].getDLCInfo(game.id)
)

addHandler('getSteamInstallLibraries', async () =>
  libraryManagerMap['steam'].getInstallLibraries()
)

addHandler('getSteamCloudSyncStatus', (_e, game) =>
  libraryManagerMap['steam'].getGame(game.id).getCloudSyncStatus()
)

addHandler('runSteamCloudSync', async (_e, game, direction) =>
  libraryManagerMap['steam'].getGame(game.id).runCloudSync(direction)
)

addHandler('resolveSteamCloudSync', async (_e, game, resolve) =>
  libraryManagerMap['steam'].getGame(game.id).resolveCloudSync(resolve)
)

addHandler('listSteamCloudFiles', async (_e, game) =>
  libraryManagerMap['steam'].getGame(game.id).listCloudFiles()
)

addHandler('setSteamDlcEnabled', async (_e, dlcAppId, enabled) =>
  // setDlcEnabled operates on the DLC's app id, not a specific game instance.
  libraryManagerMap['steam'].getGame(dlcAppId).setDlcEnabled(dlcAppId, enabled)
)

addHandler('getSteamIntegrationEnabled', (_e, game) =>
  libraryManagerMap['steam'].getGame(game.id).getSteamIntegrationEnabled()
)

addHandler('getSteamLaunchTargets', async (_e, game) =>
  libraryManagerMap['steam'].getGame(game.id).getLaunchTargets()
)

addHandler('setSteamLaunchTarget', (_e, game, targetId) =>
  libraryManagerMap['steam'].getGame(game.id).setLaunchTarget(targetId)
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

addListener('setSteamIntegrationEnabled', (_e, game, enabled) => {
  libraryManagerMap['steam']
    .getGame(game.id)
    .setSteamIntegrationEnabled(enabled)
})

addListener('logoutSteamAccount', (_e, steamId) => {
  void SteamUser.logoutAccount(steamId)
})
