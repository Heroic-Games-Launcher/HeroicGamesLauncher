import { safeStorage } from 'electron'
import { logWarning, LogPrefix } from 'backend/logger'

const CIPHERTEXT_PREFIX = 'ratings:v1:'
let didLogEncryptionUnavailable = false

function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function isEncryptedValue(stored: string): boolean {
  return stored.startsWith(CIPHERTEXT_PREFIX)
}

export function encryptApiKey(plain: string): string {
  if (!plain) return ''
  if (!isEncryptionAvailable()) {
    if (!didLogEncryptionUnavailable) {
      logWarning(
        'safeStorage unavailable, storing ratings API key in plaintext',
        LogPrefix.Backend
      )
      didLogEncryptionUnavailable = true
    }
    return plain
  }

  const ciphertext = safeStorage.encryptString(plain).toString('base64')
  return `${CIPHERTEXT_PREFIX}${ciphertext}`
}

export function decryptApiKey(stored: string): string {
  if (!stored) return ''
  if (!isEncryptedValue(stored)) {
    // Legacy plaintext fallback
    return stored
  }

  if (!isEncryptionAvailable()) return ''

  try {
    const buf = Buffer.from(stored.slice(CIPHERTEXT_PREFIX.length), 'base64')
    return safeStorage.decryptString(buf)
  } catch (error) {
    logWarning(['Failed to decrypt ratings API key:', error], LogPrefix.Backend)
    return ''
  }
}
