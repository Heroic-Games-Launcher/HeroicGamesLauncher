import { addHandler, addListener } from 'backend/ipc'
import { loadUsers } from './user'
import { steamEnabledUsers } from './electronStores'

addHandler('getSteamUsers', () => loadUsers())
addHandler('getSteamUsersEnabled', () =>
  Object.entries(steamEnabledUsers.raw_store)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id)
)
addListener('setSteamUserStatus', (e, userId, status) =>
  steamEnabledUsers.set(userId, status)
)
