import { nativeImage } from 'electron'
import { createHash } from 'crypto'
import { stat } from 'fs/promises'
import { extname, isAbsolute, join } from 'path'
import { heroicIconFolder } from 'backend/constants/paths'
import { logWarning, LogPrefix } from 'backend/logger'
import { decodeIconBitmap, readExeIconResources } from './exeIconResources'
import { pngSignature, readIconFile, writeIconPng } from './iconCache'

const pendingIcons = new Map<string, Promise<string | undefined>>()

/** Resolve an install-relative executable without altering absolute sideload paths. */
export function resolveIconExecutable(
  executable: string,
  installPath?: string
) {
  if (typeof executable !== 'string') return undefined
  if (isAbsolute(executable)) return executable
  if (typeof installPath !== 'string' || !installPath) return undefined
  return join(installPath, executable.replaceAll('\\', '/'))
}

/** Cache a PNG suitable for Linux menus; failed extraction leaves artwork as fallback. */
export async function getExeIcon(
  executable: string
): Promise<string | undefined> {
  if (typeof executable !== 'string') return undefined
  if (extname(executable).toLowerCase() !== '.exe') return undefined
  try {
    const source = await stat(executable)
    if (!source.isFile()) return undefined
    const hash = createHash('sha256')
      .update(
        JSON.stringify([
          'v1',
          executable,
          source.size,
          source.mtimeMs,
          source.ctimeMs
        ])
      )
      .digest('hex')
    const output = join(heroicIconFolder, `exe-${hash}.png`)
    const pending = pendingIcons.get(output)
    if (pending) return await pending
    const extraction = extractIcon(executable, output)
    pendingIcons.set(output, extraction)
    try {
      return await extraction
    } finally {
      pendingIcons.delete(output)
    }
  } catch (error) {
    logWarning(
      ['Could not extract shortcut icon from EXE:', error],
      LogPrefix.Backend
    )
    return undefined
  }
}

async function extractIcon(executable: string, output: string) {
  const cached = await readIconFile(output)
  if (cached?.subarray(0, 8).equals(pngSignature)) return output
  const icons = await readExeIconResources(executable)
  for (const data of icons) {
    let png: Buffer
    try {
      let image
      if (data.subarray(0, 8).equals(pngSignature)) {
        // Bound decoded PNG dimensions before passing data to Chromium.
        if (
          data.length < 24 ||
          data.readUInt32BE(16) < 1 ||
          data.readUInt32BE(20) < 1 ||
          data.readUInt32BE(16) > 256 ||
          data.readUInt32BE(20) > 256
        )
          continue
        image = nativeImage.createFromBuffer(data)
      } else {
        const { pixels, width, height } = decodeIconBitmap(data)
        image = nativeImage.createFromBitmap(pixels, { width, height })
      }
      if (image.isEmpty()) continue
      png = image.toPNG()
    } catch {
      // Try a smaller icon if a larger embedded image is unsupported.
      continue
    }
    await writeIconPng(output, png)
    return output
  }
  return undefined
}
