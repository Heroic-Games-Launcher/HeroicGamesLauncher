import { promises as fsp } from 'graceful-fs'
import { logError } from 'backend/logger'

/**
 * Reads the first `n` bytes of a file as a Buffer.
 * If the file is smaller than `n` bytes, the whole file is read.
 */
export async function readFirstBytes(path: string, n: number): Promise<Buffer> {
  let fileHandle: fsp.FileHandle | undefined
  try {
    fileHandle = await fsp.open(path, 'r')
    const stat = await fileHandle.stat()
    if (!stat.isFile()) {
      throw new Error(`${path} is not a file`)
    }
    const bytesToRead = Math.min(stat.size, n)

    const buffer = Buffer.alloc(bytesToRead)
    await fileHandle.read(buffer, 0, bytesToRead, 0)
    return buffer
  } catch (error) {
    logError(`Error reading first bytes of ${path}: ${error}`)
    throw error
  } finally {
    if (fileHandle !== undefined) {
      await fileHandle.close()
    }
  }
}
