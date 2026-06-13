import type { EpicFriendsList } from 'common/types/epic_friends'

type EpicFriendsListener = (username: string, friends: EpicFriendsList) => void

let cachedFriends:
  | { username: string; friends: EpicFriendsList }
  | undefined
let pendingLoad:
  | { username: string; promise: Promise<EpicFriendsList> }
  | undefined
const listeners = new Set<EpicFriendsListener>()

function friendsListsMatch(first: EpicFriendsList, second: EpicFriendsList) {
  if (
    first.resolvingNames !== second.resolvingNames ||
    first.watchingPresence !== second.watchingPresence
  )
    return false

  return (['friends', 'incoming', 'outgoing'] as const).every((listName) => {
    const firstList = first[listName]
    const secondList = second[listName]
    return (
      firstList.length === secondList.length &&
      firstList.every((friend, index) => {
        const other = secondList[index]
        return (
          friend.accountId === other.accountId &&
          friend.displayName === other.displayName &&
          friend.epicDisplayName === other.epicDisplayName &&
          friend.presenceStatus === other.presenceStatus &&
          friend.status === other.status &&
          friend.mutual === other.mutual &&
          friend.favorite === other.favorite &&
          friend.created === other.created
        )
      })
    )
  })
}

export function getCachedEpicFriends(username?: string) {
  return username && cachedFriends?.username === username
    ? cachedFriends.friends
    : undefined
}

export function clearCachedEpicFriends() {
  cachedFriends = undefined
  pendingLoad = undefined
}

export function subscribeToEpicFriends(listener: EpicFriendsListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function loadEpicFriends(
  username: string,
  forceRefresh = false
): Promise<EpicFriendsList> {
  if (!forceRefresh) {
    const cached = getCachedEpicFriends(username)
    if (cached) return Promise.resolve(cached)
  }

  if (pendingLoad?.username === username) return pendingLoad.promise

  const promise = window.api.getEpicFriends().then((friends) => {
    if (
      cachedFriends?.username === username &&
      friendsListsMatch(cachedFriends.friends, friends)
    )
      return cachedFriends.friends

    cachedFriends = { username, friends }
    listeners.forEach((listener) => listener(username, friends))
    return friends
  })
  pendingLoad = { username, promise }

  const clearPending = () => {
    if (pendingLoad?.promise === promise) pendingLoad = undefined
  }
  void promise.then(clearPending, clearPending)

  return promise
}
