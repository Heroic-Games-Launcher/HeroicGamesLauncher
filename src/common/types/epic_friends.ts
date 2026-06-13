export type EpicFriendStatus = 'accepted' | 'incoming' | 'outgoing'

export interface EpicFriend {
  accountId: string
  displayName: string
  status: EpicFriendStatus
  mutual: number
  favorite: boolean
  created: string
}

export interface EpicFriendsList {
  friends: EpicFriend[]
  incoming: EpicFriend[]
  outgoing: EpicFriend[]
}
