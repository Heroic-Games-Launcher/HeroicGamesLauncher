import { nativeImage } from 'electron'
import { randomUUID } from 'crypto'
import { mkdir, open, rename, rm, writeFile } from 'fs/promises'
import { dirname } from 'path'

export const maxIconBytes = 8 * 1024 * 1024
export const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex')

/** Reject missing, oversized, empty and corrupt files rather than caching failures. */
export async function readIconFile(path: string): Promise<Buffer | undefined> {
  try {
    const handle = await open(path, 'r')
    try {
      const file = await handle.stat()
      if (!file.isFile() || !file.size || file.size > maxIconBytes)
        return undefined
      // Read a bounded snapshot even if the file grows after stat().
      const data = Buffer.alloc(file.size)
      let offset = 0
      while (offset < data.length) {
        const { bytesRead } = await handle.read(
          data,
          offset,
          data.length - offset,
          offset
        )
        if (!bytesRead) return undefined
        offset += bytesRead
      }
      return nativeImage.createFromBuffer(data).isEmpty() ? undefined : data
    } finally {
      await handle.close()
    }
  } catch {
    return undefined
  }
}

/** Publish only complete PNG files, and remove temporary files on every failure. */
export async function writeIconPng(path: string, data: Buffer): Promise<void> {
  if (!data.subarray(0, 8).equals(pngSignature) || data.length > maxIconBytes)
    throw new Error('Invalid shortcut PNG')
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temp, data, { flag: 'wx', mode: 0o600 })
    await rename(temp, path)
  } finally {
    await rm(temp, { force: true }).catch(() => undefined)
  }
}
