import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'
import { gameManagerMap, libraryManagerMap } from '..'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addHandler('getSteamDlcInfo', async (_e, appName) =>
  libraryManagerMap['steam'].getDLCInfo(appName)
)

addHandler('setSteamDlcEnabled', async (_e, dlcAppId, enabled) =>
  gameManagerMap['steam'].setDlcEnabled(dlcAppId, enabled)
)

addListener('logoutSteamAccount', (_e, steamId) => {
  void SteamUser.logoutAccount(steamId)
})
