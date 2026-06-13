import axios from 'axios'
import { readFileSync } from 'graceful-fs'

import { logError, LogPrefix } from 'backend/logger'
import type {
  EpicFriend,
  EpicFriendsList,
  EpicFriendStatus
} from 'common/types/epic_friends'
import { legendaryUserInfo } from './constants'

const friendsApi = 'https://friends-public-service-prod.ol.epicgames.com'
const accountApi = 'https://account-public-service-prod.ol.epicgames.com'
const accountLookupBatchSize = 20
const displayNameCache = new Map<string, string>()

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

function normalizeEntries(
  entries: EpicFriendEntry[],
  status: EpicFriendStatus,
  displayNames: ReadonlyMap<string, string>
): EpicFriend[] {
  return entries
    .map((entry) => ({
      accountId: entry.accountId,
      displayName:
        displayNames.get(entry.accountId) ?? fallbackDisplayName(entry),
      status,
      mutual: entry.mutual ?? 0,
      favorite: entry.favorite ?? false,
      created: entry.created ?? ''
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export function normalizeEpicFriends(
  summary: EpicFriendsSummary,
  displayNames: ReadonlyMap<string, string>
): EpicFriendsList {
  return {
    friends: normalizeEntries(summary.friends, 'accepted', displayNames),
    incoming: normalizeEntries(summary.incoming, 'incoming', displayNames),
    outgoing: normalizeEntries(summary.outgoing, 'outgoing', displayNames)
  }
}

async function resolveDisplayNames(
  entries: EpicFriendEntry[],
  accessToken: string
): Promise<Map<string, string>> {
  const ids = [...new Set(entries.map(({ accountId }) => accountId))]
  const unresolvedIds = ids.filter((id) => !displayNameCache.has(id))
  const headers = { Authorization: `Bearer ${accessToken}` }

  for (
    let index = 0;
    index < unresolvedIds.length;
    index += accountLookupBatchSize
  ) {
    const batch = unresolvedIds.slice(index, index + accountLookupBatchSize)
    await Promise.all(
      batch.map(async (accountId) => {
        try {
          const { data } = await axios.get<EpicAccount>(
            `${accountApi}/account/api/public/account/${encodeURIComponent(accountId)}`,
            { headers }
          )
          if (data.displayName)
            displayNameCache.set(accountId, data.displayName)
        } catch {
          // Epic can hide account details. The UI will use an alias or account ID.
        }
      })
    )
  }

  return new Map(
    ids.flatMap((id) => {
      const displayName = displayNameCache.get(id)
      return displayName ? [[id, displayName]] : []
    })
  )
}

export async function getEpicFriends(): Promise<EpicFriendsList> {
  try {
    const { access_token: accessToken, account_id: accountId } =
      readLegendaryAuth()
    const headers = { Authorization: `Bearer ${accessToken}` }
    const { data: summary } = await axios.get<EpicFriendsSummary>(
      `${friendsApi}/friends/api/v1/${encodeURIComponent(accountId)}/summary`,
      { headers }
    )
    const entries = [
      ...summary.friends,
      ...summary.incoming,
      ...summary.outgoing
    ]
    const displayNames = await resolveDisplayNames(entries, accessToken)

    return normalizeEpicFriends(summary, displayNames)
  } catch (error) {
    logError(
      `Failed to get Epic friends: ${error instanceof Error ? error.message : String(error)}`,
      LogPrefix.Legendary
    )
    throw new Error('Could not load Epic friends')
  }
}
