import axios from 'axios'
import { readFileSync } from 'graceful-fs'

import { logError, LogPrefix } from 'backend/logger'
import type {
  EpicFriend,
  EpicFriendAction,
  EpicFriendDetails,
  EpicFriendSearchResult,
  EpicFriendsList,
  EpicFriendStatus
} from 'common/types/epic_friends'
import { legendaryUserInfo } from './constants'
import { friendDisplayNameStore } from './electronStores'
import {
  getEpicPresence,
  isWatchingEpicPresence,
  startEpicPresence
} from './presence'

const friendsApi = 'https://friends-public-service-prod.ol.epicgames.com'
const accountApi = 'https://account-public-service-prod.ol.epicgames.com'
const accountLookupBatchSize = 100
const maxAccountLookupAttempts = 3
const displayNameCache = new Map<string, string>()
let displayNameResolution: Promise<void> | undefined
let displayNameStoreLoaded = false
let friendsSummaryCache:
  | { accountId: string; fetchedAt: number; summary: EpicFriendsSummary }
  | undefined

interface LegendaryAuth {
  access_token: string
  account_id: string
}

interface EpicFriendEntry {
  accountId: string
  alias?: string
  mutual?: number
  favorite?: boolean
  created?: string
}

interface EpicFriendsSummary {
  friends: EpicFriendEntry[]
  incoming: EpicFriendEntry[]
  outgoing: EpicFriendEntry[]
}

interface EpicAccount {
  id: string
  displayName?: string
}

interface EpicExternalAuth {
  type?: string
  externalDisplayName?: string
}

interface EpicApiError {
  messageVars?: string[]
}

function readLegendaryAuth(): LegendaryAuth {
  const auth = JSON.parse(
    readFileSync(legendaryUserInfo, 'utf8')
  ) as LegendaryAuth
  if (!auth.access_token || !auth.account_id) {
    throw new Error('Epic Games login information is incomplete')
  }
  return auth
}

function fallbackDisplayName(entry: EpicFriendEntry): string {
  return entry.alias?.trim() || `Epic user ${entry.accountId.slice(0, 8)}`
}

function presenceSortRank(friend: EpicFriend) {
  if (friend.presenceStatus === 'online') return 0
  if (friend.presenceStatus === 'away') return 1
  return 2
}

export function compareEpicFriends(a: EpicFriend, b: EpicFriend) {
  return (
    presenceSortRank(a) - presenceSortRank(b) ||
    a.displayName.localeCompare(b.displayName)
  )
}

function normalizeEntries(
  entries: EpicFriendEntry[],
  status: EpicFriendStatus,
  displayNames: ReadonlyMap<string, string>
): EpicFriend[] {
  return entries
    .map((entry) => {
      const epicDisplayName = displayNames.get(entry.accountId) ?? ''
      return {
        accountId: entry.accountId,
        displayName:
          entry.alias?.trim() || epicDisplayName || fallbackDisplayName(entry),
        epicDisplayName,
        alias: entry.alias?.trim() ?? '',
        status,
        ...getEpicPresence(entry.accountId),
        mutual: entry.mutual ?? 0,
        favorite: entry.favorite ?? false,
        created: entry.created ?? ''
      }
    })
    .sort(
      status === 'accepted'
        ? compareEpicFriends
        : (a, b) => a.displayName.localeCompare(b.displayName)
    )
}

export function normalizeEpicFriends(
  summary: EpicFriendsSummary,
  displayNames: ReadonlyMap<string, string>
): EpicFriendsList {
  return {
    friends: normalizeEntries(summary.friends, 'accepted', displayNames),
    incoming: normalizeEntries(summary.incoming, 'incoming', displayNames),
    outgoing: normalizeEntries(summary.outgoing, 'outgoing', displayNames),
    resolvingNames: false,
    watchingPresence: false
  }
}

async function resolveDisplayNames(
  entries: EpicFriendEntry[],
  accessToken: string
): Promise<void> {
  const ids = [...new Set(entries.map(({ accountId }) => accountId))]
  const unresolvedIds = ids.filter((id) => !displayNameCache.has(id))
  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    const batches = Array.from(
      { length: Math.ceil(unresolvedIds.length / accountLookupBatchSize) },
      (_, index) =>
        unresolvedIds.slice(
          index * accountLookupBatchSize,
          (index + 1) * accountLookupBatchSize
        )
    )
    const accounts = (
      await Promise.all(
        batches.map((batch) => lookupDisplayNames(batch, headers))
      )
    ).flat()

    for (const { id, displayName = '' } of accounts) {
      displayNameCache.set(id, displayName)
      friendDisplayNameStore.set(id, displayName)
    }
  } finally {
    friendDisplayNameStore.commit()
  }
}

function loadCachedDisplayNames(entries: EpicFriendEntry[]) {
  if (!displayNameStoreLoaded) {
    friendDisplayNameStore.use_in_memory()
    displayNameStoreLoaded = true
  }

  for (const { accountId } of entries) {
    const cachedName = friendDisplayNameStore.get(accountId)
    if (cachedName !== undefined) displayNameCache.set(accountId, cachedName)
  }
}

function startDisplayNameResolution(
  entries: EpicFriendEntry[],
  accessToken: string
) {
  if (
    displayNameResolution ||
    entries.every(({ accountId }) => displayNameCache.has(accountId))
  )
    return

  displayNameResolution = resolveDisplayNames(entries, accessToken)
    .catch((error) => {
      logError(
        `Failed to resolve Epic friend names: ${error instanceof Error ? error.message : String(error)}`,
        LogPrefix.Legendary
      )
    })
    .finally(() => {
      displayNameResolution = undefined
    })
}

function getRetryDelay(error: unknown): number | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) return

  const retryAfter = Number(error.response.headers['retry-after'])
  if (Number.isFinite(retryAfter)) return Math.max(1, retryAfter) * 1000

  const data = error.response.data as EpicApiError
  const messageDelay = Number(data.messageVars?.[0])
  if (Number.isFinite(messageDelay)) return Math.max(1, messageDelay) * 1000

  return 5000
}

export async function lookupDisplayName(
  accountId: string,
  headers: { Authorization: string }
): Promise<string | undefined> {
  for (let attempt = 1; attempt <= maxAccountLookupAttempts; attempt++) {
    try {
      const { data } = await axios.get<EpicAccount>(
        `${accountApi}/account/api/public/account/${encodeURIComponent(accountId)}`,
        { headers }
      )
      // Cache an empty string when Epic confirms that this account has no
      // public display name, so later refreshes do not repeatedly query it.
      return data.displayName ?? ''
    } catch (error) {
      const retryDelay = getRetryDelay(error)
      if (retryDelay === undefined || attempt === maxAccountLookupAttempts) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  return
}

export async function lookupDisplayNames(
  accountIds: string[],
  headers: { Authorization: string }
): Promise<EpicAccount[]> {
  if (!accountIds.length) return []

  for (let attempt = 1; attempt <= maxAccountLookupAttempts; attempt++) {
    try {
      const query = accountIds
        .map((accountId) => `accountId=${encodeURIComponent(accountId)}`)
        .join('&')
      const { data } = await axios.get<EpicAccount[]>(
        `${accountApi}/account/api/public/account?${query}`,
        { headers }
      )
      return data
    } catch (error) {
      const retryDelay = getRetryDelay(error)
      if (retryDelay === undefined || attempt === maxAccountLookupAttempts) {
        return []
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  return []
}

export async function getEpicFriendDetails(
  accountId: string
): Promise<EpicFriendDetails> {
  const { access_token: accessToken } = readLegendaryAuth()
  const headers = { Authorization: `Bearer ${accessToken}` }
  const encodedAccountId = encodeURIComponent(accountId)
  const [{ data: account }, externalAuths] = await Promise.all([
    axios.get<EpicAccount>(
      `${accountApi}/account/api/public/account/${encodedAccountId}`,
      { headers }
    ),
    axios
      .get<EpicExternalAuth[]>(
        `${accountApi}/account/api/public/account/${encodedAccountId}/externalAuths`,
        { headers }
      )
      .then(({ data }) => data)
      .catch(() => [])
  ])

  return {
    connections: [
      ...(account.displayName
        ? [{ type: 'epic', displayName: account.displayName }]
        : []),
      ...externalAuths.flatMap(({ type, externalDisplayName }) =>
        type && externalDisplayName
          ? [{ type, displayName: externalDisplayName }]
          : []
      )
    ]
  }
}

export async function runEpicFriendAction(action: EpicFriendAction) {
  const { access_token: accessToken, account_id: accountId } =
    readLegendaryAuth()
  const headers = { Authorization: `Bearer ${accessToken}` }
  const friendId = encodeURIComponent(action.accountId)
  const ownId = encodeURIComponent(accountId)

  if (action.type === 'setAlias') {
    const alias = action.alias.trim()
    const url = `${friendsApi}/friends/api/v1/${ownId}/friends/${friendId}/alias`
    if (alias) await axios.put(url, { alias }, { headers })
    else await axios.delete(url, { headers })
  } else if (action.type === 'add') {
    await axios.post(
      `${friendsApi}/friends/api/public/friends/${ownId}/${friendId}`,
      undefined,
      { headers }
    )
  } else if (action.type === 'block') {
    await axios.post(
      `${friendsApi}/friends/api/public/blocklist/${ownId}/${friendId}`,
      undefined,
      { headers }
    )
  } else {
    await axios.delete(
      `${friendsApi}/friends/api/v1/${ownId}/friends/${friendId}`,
      { headers }
    )
  }

  friendsSummaryCache = undefined
}

export async function searchEpicUsers(
  prefix: string
): Promise<EpicFriendSearchResult[]> {
  const query = prefix.trim()
  if (query.length < 3) return []

  const { access_token: accessToken, account_id: accountId } =
    readLegendaryAuth()
  const headers = { Authorization: `Bearer ${accessToken}` }
  const { data } = await axios.get<{ accountId: string }[]>(
    `https://user-search-service-prod.ol.epicgames.com/api/v1/search/${encodeURIComponent(accountId)}`,
    { headers, params: { prefix: query, platform: 'epic' } }
  )
  const accounts = await lookupDisplayNames(
    data.map(({ accountId: resultId }) => resultId),
    headers
  )

  return accounts.flatMap(({ id, displayName }) =>
    displayName ? [{ accountId: id, displayName }] : []
  )
}

export async function getEpicFriends(): Promise<EpicFriendsList> {
  try {
    const { access_token: accessToken, account_id: accountId } =
      readLegendaryAuth()
    const headers = { Authorization: `Bearer ${accessToken}` }
    const cachedSummary =
      friendsSummaryCache?.accountId === accountId &&
      Date.now() - friendsSummaryCache.fetchedAt <= 30_000
        ? friendsSummaryCache.summary
        : undefined
    let summary: EpicFriendsSummary
    if (cachedSummary) {
      summary = cachedSummary
    } else {
      const response = await axios.get<EpicFriendsSummary>(
        `${friendsApi}/friends/api/v1/${encodeURIComponent(accountId)}/summary`,
        { headers }
      )
      summary = response.data
      friendsSummaryCache = { accountId, fetchedAt: Date.now(), summary }
    }

    const entries = [
      ...summary.friends,
      ...summary.incoming,
      ...summary.outgoing
    ]
    loadCachedDisplayNames(entries)
    startDisplayNameResolution(entries, accessToken)
    startEpicPresence(accessToken)

    return {
      ...normalizeEpicFriends(summary, displayNameCache),
      resolvingNames: Boolean(displayNameResolution),
      watchingPresence: isWatchingEpicPresence()
    }
  } catch (error) {
    logError(
      `Failed to get Epic friends: ${error instanceof Error ? error.message : String(error)}`,
      LogPrefix.Legendary
    )
    throw new Error('Could not load Epic friends')
  }
}
