import { addHandler } from 'backend/ipc'
import { getEpicFriends } from './friends'

addHandler('getEpicFriends', async () => getEpicFriends())
