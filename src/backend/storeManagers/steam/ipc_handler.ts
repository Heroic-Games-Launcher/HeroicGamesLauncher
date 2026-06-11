import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'
import { libraryManagerMap } from '..'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addHandler('getSteamDlcInfo', async (_e, appName) =>
  libraryManagerMap['steam'].getDLCInfo(appName)
)

addListener('logoutSteamAccount', (_e, steamId) => {
  void SteamUser.logoutAccount(steamId)
})
