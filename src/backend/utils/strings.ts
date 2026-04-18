import { logError } from 'backend/logger'

/**
 * Decodes a buffer to a UTF-8 string.
 * Any leading continuation bytes are skipped to get a clean string start.
 *
 * @param buffer The buffer to decode
 */
export function decodeUTF8(buffer: Buffer): string {
  try {
    let skip = 0
    while (skip < 4 && skip < buffer.length && (buffer[skip] & 0xc0) === 0x80) {
      skip++
    }
    return buffer.subarray(skip).toString('utf-8')
  } catch (error) {
    logError(`Error decoding buffer as UTF-8: ${error}`)
    throw error
  }
}
