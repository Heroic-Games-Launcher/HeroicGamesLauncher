import { promises as fsp } from 'graceful-fs'
import { logError } from 'backend/logger'

/**
 * Reads the last `n` bytes of a file as a Buffer.
 * If the file is smaller than `n` bytes, the whole file is read.
 */
export async function readLastBytes(path: string, n: number): Promise<Buffer> {
  let fileHandle: fsp.FileHandle | undefined
  try {
    fileHandle = await fsp.open(path, 'r')
    const { size: fileSize } = await fileHandle.stat()
    const bytesToRead = Math.min(fileSize, n)
    const position = fileSize - bytesToRead

    const buffer = Buffer.alloc(bytesToRead)
    await fileHandle.read(buffer, 0, bytesToRead, position)
    return buffer
  } catch (error) {
    logError(`Error reading last bytes of ${path}: ${error}`)
    throw error
  } finally {
    if (fileHandle !== undefined) {
      await fileHandle.close()
    }
  }
}
