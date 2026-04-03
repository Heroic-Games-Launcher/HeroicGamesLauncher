import { open, stat, read, close } from 'graceful-fs'
import { promisify } from 'util'
import { logError } from 'backend/logger'

const openAsync = promisify(open)
const statAsync = promisify(stat)
const readAsync = promisify(read)
const closeAsync = promisify(close)

/**
 * Reads the last `n` bytes of a file, treats them as UTF-8 and returns a string promise for it.
 * If the file is smaller than `n` bytes, the whole file is read.
 */
export async function readLastBytes(path: string, n: number): Promise<string> {
  let fd: number | undefined
  try {
    const stats = await statAsync(path)
    const fileSize = stats.size
    const bytesToRead = Math.min(fileSize, n)
    const position = fileSize - bytesToRead

    fd = await openAsync(path, 'r')
    const buffer = Buffer.alloc(bytesToRead)
    await readAsync(fd, buffer, 0, bytesToRead, position)

    // If not at the start of the file, ensure we start at a valid UTF-8 boundary.
    let skip = 0
    if (position > 0) {
      while (
        skip < 4 &&
        skip < buffer.length &&
        (buffer[skip] & 0xc0) === 0x80
      ) {
        skip++
      }
    }
    return buffer.subarray(skip).toString('utf-8')
  } catch (error) {
    logError(`Error reading last bytes of ${path}: ${error}`)
    return ''
  } finally {
    if (fd !== undefined) {
      await closeAsync(fd)
    }
  }
}
