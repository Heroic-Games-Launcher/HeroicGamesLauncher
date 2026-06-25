import { logError, LogPrefix } from 'backend/logger'
import type { EpicFriendPresence } from 'common/types/epic_friends'
import { HLPM } from './hlpm'

const presenceByAccountId = new Map<string, EpicFriendPresence>()
let client: HLPM | undefined
let connectionAttempt: Promise<void> | undefined
let lastConnectionFailure = 0

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

async function connect(accessToken: string) {
  const epicClient = new HLPM(accessToken, handleRawPresence)
  client = epicClient
  try {
    await epicClient.connect()
  } finally {
    if (!epicClient.isConnected() && client === epicClient) {
      client = undefined
    }
  }
}

export function startEpicPresence(accessToken: string) {
  if (
    client?.isConnected() ||
    connectionAttempt ||
    Date.now() - lastConnectionFailure < 60_000
  )
    return

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
  return Boolean(connectionAttempt || client?.isConnected())
}

export async function stopEpicPresence() {
  presenceByAccountId.clear()
  if (!client) return

  await client.disconnect()
  client = undefined
}
