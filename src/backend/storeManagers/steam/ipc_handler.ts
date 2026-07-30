import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'
import { libraryManagerMap } from '..'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addHandler('getSteamDlcInfo', async (_e, game) =>
  libraryManagerMap['steam'].getDLCInfo(game.id)
)

addHandler('getSteamInstallLibraries', async () =>
  libraryManagerMap['steam'].getInstallLibraries()
)

addHandler('setSteamDlcEnabled', async (_e, dlcAppId, enabled) =>
  // setDlcEnabled operates on the DLC's app id, not a specific game instance.
  libraryManagerMap['steam'].getGame(dlcAppId).setDlcEnabled(dlcAppId, enabled)
)

addHandler('getSteamIntegrationEnabled', (_e, game) =>
  libraryManagerMap['steam'].getGame(game.id).getSteamIntegrationEnabled()
)

addListener('setSteamIntegrationEnabled', (_e, game, enabled) => {
  libraryManagerMap['steam']
    .getGame(game.id)
    .setSteamIntegrationEnabled(enabled)
})

addListener('logoutSteamAccount', (_e, steamId) => {
  void SteamUser.logoutAccount(steamId)
})
