import { LogPrefix, MaxLogPrefixLength, MaxLogLevelLength } from './constants'

import type { LogLevel } from './constants'

async function formatLogMessage(
  message: unknown,
  logLevel: LogLevel,
  logPrefix: LogPrefix
): Promise<string> {
  const prefixes: string[] = []

  const now = new Date()
  const timePrefix = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':')
  prefixes.push(`(${timePrefix})`)

  const logLevelPrefix = `[${logLevel}]:`.padEnd(MaxLogLevelLength + 3, ' ')
  prefixes.push(logLevelPrefix)

  if (logPrefix)
    prefixes.push(`[${logPrefix}]:`.padEnd(MaxLogPrefixLength + 3, ' '))

  const joinedPrefixes = prefixes.join(' ')
  const messageStr = await convertUnknownToString(message)
  // HACK: Return an empty string if `messageStr` is empty. This is done to skip
  //       logging completely if we only have (usually hardcoded) prefixes
  if (!messageStr.length) return ''
  return `${joinedPrefixes} ${messageStr}`
}

async function convertUnknownToString(message: unknown): Promise<string> {
  if (Array.isArray(message)) {
    const messageParts = await Promise.all(message.map(convertUnknownToString))
    return messageParts.join(' ')
  }

  if (
    typeof message === 'string' ||
    typeof message === 'number' ||
    typeof message === 'boolean'
  )
    return message.toString()

  if (message instanceof Promise) return convertUnknownToString(await message)
  if (message instanceof Error) return message.stack ?? message.message

  return JSON.stringify(message, null, 2)
}

export { formatLogMessage }
