import { promises as fsp } from 'graceful-fs'
import { logError } from 'backend/logger'

/**
 * Reads the last `n` bytes of a file, treats them as UTF-8 and returns a string promise for it.
 * If the file is smaller than `n` bytes, the whole file is read.
 */
export async function readLastBytes(path: string, n: number): Promise<string> {
  let fileHandle: fsp.FileHandle | undefined
  let buffer = undefined
  let position = 0
  try {
    fileHandle = await fsp.open(path, 'r')
    const { size: fileSize } = await fileHandle.stat()
    const bytesToRead = Math.min(fileSize, n)
    position = fileSize - bytesToRead

    buffer = Buffer.alloc(bytesToRead)
    await fileHandle.read(buffer, 0, bytesToRead, position)
  } catch (error) {
    logError(`Error reading last bytes of ${path}: ${error}`)
    throw error
  } finally {
    if (fileHandle !== undefined) {
      await fileHandle.close()
    }
  }

  // If not at the start of the file, ensure we start at a valid UTF-8 boundary.
  try {
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
    // toString is pretty permissive, but let's have this path as a fallback
    logError(`Error decoding ${path} as UTF-8: ${error}`)
    throw error
  }
}
