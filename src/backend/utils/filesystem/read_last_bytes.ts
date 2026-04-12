import { promises as fsp } from 'graceful-fs'
import { logError } from 'backend/logger'

/**
 * Reads the last `n` bytes of a file, treats them as UTF-8 and returns a string promise for it.
 * If the file is smaller than `n` bytes, the whole file is read.
 */
export async function readLastBytes(path: string, n: number): Promise<string> {
  let fileHandle: fsp.FileHandle | undefined
  try {
    fileHandle = await fsp.open(path, 'r')
    const { size: fileSize } = await fileHandle.stat()
    const bytesToRead = Math.min(fileSize, n)
    const position = fileSize - bytesToRead

    const buffer = Buffer.alloc(bytesToRead)
    await fileHandle.read(buffer, 0, bytesToRead, position)

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
    throw error
  } finally {
    if (fileHandle !== undefined) {
      await fileHandle.close()
    }
  }
}
