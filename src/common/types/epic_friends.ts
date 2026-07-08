export type EpicFriendStatus = 'accepted' | 'incoming' | 'outgoing'
type EpicFriendPresenceStatus = 'online' | 'away' | 'offline' | 'unknown'

export interface EpicFriendPresence {
  presenceStatus: EpicFriendPresenceStatus
}

export interface EpicFriend extends EpicFriendPresence {
  accountId: string
  displayName: string
  epicDisplayName: string
  alias: string
  status: EpicFriendStatus
  mutual: number
  favorite: boolean
  created: string
}

interface EpicFriendConnection {
  type: string
  displayName: string
}

export interface EpicFriendDetails {
  connections: EpicFriendConnection[]
}

export interface EpicFriendSearchResult {
  accountId: string
  displayName: string
}

export type EpicFriendAction =
  | { type: 'setAlias'; accountId: string; alias: string }
  | { type: 'add'; accountId: string }
  | { type: 'block'; accountId: string }
  | { type: 'unfriend'; accountId: string }

export interface EpicFriendsList {
  friends: EpicFriend[]
  incoming: EpicFriend[]
  outgoing: EpicFriend[]
  resolvingNames: boolean
  watchingPresence: boolean
}
