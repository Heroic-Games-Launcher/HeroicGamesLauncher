import axios from 'axios'
import { Client, type FriendPresence } from 'fnbr'

import { logError, LogPrefix } from 'backend/logger'
import type { EpicFriendPresence } from 'common/types/epic_friends'

const presenceByAccountId = new Map<string, EpicFriendPresence>()
let client: Client | undefined
let connectionAttempt: Promise<void> | undefined
let lastConnectionFailure = 0
let stopRequested = false
function getXmlAttribute(message: string, attribute: string) {
  return message.match(
    new RegExp(`\\s${attribute}=(?:'|")([^'"]+)(?:'|")`)
  )?.[1]
}

function getXmlElementText(message: string, element: string) {
  const value = message.match(
    new RegExp(`<${element}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${element}>`)
  )?.[1]

  return value?.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
}

export function parseRawEpicPresence(
  message: string
): { accountId: string; presence: EpicFriendPresence } | undefined {
  const from = getXmlAttribute(message, 'from')
  const accountId = from?.split('@')[0]
  if (!accountId) return

  const type = getXmlAttribute(message, 'type')
  if (type === 'unavailable') {
    return { accountId, presence: { presenceStatus: 'offline' } }
  }
  if (type && type !== 'available') return

  const show = getXmlElementText(message, 'show')

  return {
    accountId,
    presence: {
      presenceStatus: show === 'away' || show === 'xa' ? 'away' : 'online'
    }
  }
}

function handleRawPresence(message: string) {
  const parsed = parseRawEpicPresence(message)
  if (parsed) {
    presenceByAccountId.set(parsed.accountId, parsed.presence)
  }
}

function setPresence(
  accountId: string,
  presenceStatus: EpicFriendPresence['presenceStatus']
) {
  presenceByAccountId.set(accountId, { presenceStatus })
}

function handlePresence(presence: FriendPresence) {
  setPresence(
    presence.friend.id,
    presence.onlineType === 'away' ? 'away' : 'online'
  )
}

function normalizeOnlineType(onlineType: FriendPresence['onlineType']) {
  if (onlineType === 'away' || onlineType === 'xa') return 'away'
  return 'online'
}

async function getExchangeCode(accessToken: string): Promise<string> {
  const { data } = await axios.get<{ code: string }>(
    'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return data.code
}

async function connect(accessToken: string) {
  const epicClient = new Client({
    auth: {
      authClient: 'fortnitePCGameClient',
      exchangeCode: () => getExchangeCode(accessToken),
      killOtherTokens: false
    },
    connectToSTOMP: false,
    createParty: false,
    disablePartyService: true,
    fetchFriends: true,
    forceNewParty: false,
    xmppDebug: (message) => {
      if (message.startsWith('IN <presence')) handleRawPresence(message)
    }
  })

  epicClient.on('friend:presence', (_before, after) => {
    handlePresence(after)
  })
  epicClient.on('friend:online', (friend) => {
    setPresence(
      friend.id,
      friend.presence
        ? normalizeOnlineType(friend.presence.onlineType)
        : 'online'
    )
  })
  epicClient.on('friend:offline', (friend) => {
    setPresence(friend.id, 'offline')
  })
  epicClient.on('ready', () => {
    setTimeout(() => {
      for (const friend of epicClient.friend.list.values()) {
        if (friend.presence) {
          handlePresence(friend.presence)
        }
      }
    }, 15_000)
  })

  await epicClient.login()
  if (stopRequested) {
    await epicClient.logout()
    return
  }
  client = epicClient
}

export function startEpicPresence(accessToken: string) {
  if (
    client?.xmpp.isConnected ||
    connectionAttempt ||
    Date.now() - lastConnectionFailure < 60_000
  )
    return

  stopRequested = false
  connectionAttempt = connect(accessToken)
    .catch((error) => {
      lastConnectionFailure = Date.now()
      logError(
        `Failed to connect to Epic presence: ${error instanceof Error ? error.message : String(error)}`,
        LogPrefix.Legendary
      )
    })
    .finally(() => {
      connectionAttempt = undefined
    })
}

export function getEpicPresence(accountId: string): EpicFriendPresence {
  return presenceByAccountId.get(accountId) ?? { presenceStatus: 'unknown' }
}

export function isWatchingEpicPresence() {
  return Boolean(connectionAttempt || client?.xmpp.isConnected)
}

export async function stopEpicPresence() {
  stopRequested = true
  presenceByAccountId.clear()
  if (!client) return

  await client.logout()
  client = undefined
}
