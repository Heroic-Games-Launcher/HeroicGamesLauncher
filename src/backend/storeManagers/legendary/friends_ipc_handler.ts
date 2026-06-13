import { addHandler } from 'backend/ipc'
import {
  getEpicFriendDetails,
  getEpicFriends,
  runEpicFriendAction,
  searchEpicUsers
} from './friends'
import { stopEpicPresence } from './presence'

addHandler('getEpicFriends', async () => getEpicFriends())
addHandler('getEpicFriendDetails', async (_, accountId) =>
  getEpicFriendDetails(accountId)
)
addHandler('runEpicFriendAction', async (_, action) =>
  runEpicFriendAction(action)
)
addHandler('searchEpicUsers', async (_, prefix) => searchEpicUsers(prefix))
addHandler('stopEpicFriendsBackground', async () => stopEpicPresence())
