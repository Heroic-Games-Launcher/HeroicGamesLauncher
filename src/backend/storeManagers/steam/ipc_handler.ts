import { addHandler, addListener } from 'backend/ipc'
import { SteamUser } from './user'

addHandler('getSteamUsers', () => SteamUser.getAccounts())

addListener('logoutSteamAccount', (_e, steamId) =>
  SteamUser.logoutAccount(steamId)
)
