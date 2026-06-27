import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'
import { libraryManagerMap } from '..'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addHandler('getSteamDlcInfo', async (_e, appName) =>
  libraryManagerMap['steam'].getDLCInfo(appName)
)

addHandler('setSteamDlcEnabled', async (_e, dlcAppId, enabled) =>
  // setDlcEnabled operates on the DLC's app id, not a specific game instance.
  libraryManagerMap['steam'].getGame(dlcAppId).setDlcEnabled(dlcAppId, enabled)
)

addHandler('getSteamIntegrationEnabled', (_e, appName) =>
  libraryManagerMap['steam'].getGame(appName).getSteamIntegrationEnabled()
)

addListener('setSteamIntegrationEnabled', (_e, appName, enabled) => {
  libraryManagerMap['steam']
    .getGame(appName)
    .setSteamIntegrationEnabled(enabled)
})

addListener('logoutSteamAccount', (_e, steamId) => {
  void SteamUser.logoutAccount(steamId)
})
