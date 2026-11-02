import { existsSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { GameInfo } from 'common/types'
import { basename, dirname, extname, isAbsolute, join } from 'path'
import { libraryManagerMap } from '../storeManagers'
import { downloadFile } from 'backend/utils'
import { createAbortController } from 'backend/utils/aborthandler/aborthandler'
import {
  heroicIconFolder as iconsFolder,
  windowIcon
} from 'backend/constants/paths'
import { nativeImage } from 'electron'
import axios from 'axios'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'
import { logWarning, LogPrefix } from 'backend/logger'
import { maxIconBytes, readIconFile, writeIconPng } from './iconCache'

function createImage(
  buffer: Buffer,
  outputFilePath: string
): string | undefined {
  try {
    writeFileSync(outputFilePath, buffer, {
      encoding: 'ascii'
    })
  } catch (error) {
    return `${error}`
  }
  return
}

function downloadImage(
  imageURL: string,
  outputFilePath: string
): string | undefined {
  try {
    downloadFile({
      url: imageURL,
      dest: outputFilePath,
      abortSignal: createAbortController(imageURL).signal
    })
  } catch (error) {
    return `Donwloading of ${imageURL} failed with:\n${error}`
  }
  return
}

function removeImage(imagePath: string): string | undefined {
  try {
    unlinkSync(imagePath)
  } catch (error) {
    return `Removing of ${imagePath} failed with:\n${error}`
  }
  return
}

function checkImageExistsAlready(image: string): boolean {
  const extentions = ['.png', '.jpg']

  const imageName = basename(image).replace(extname(image), '')
  const dirName = dirname(image)

  const found = extentions.find((extention) => {
    return existsSync(join(dirName, imageName + extention))
  })

  return found !== undefined ? true : false
}

/** Prefer a real, readable icon; never leave a shortcut pointing at a pending download. */
async function getIcon(appName: string, gameInfo: GameInfo): Promise<string> {
  const fallback = await getFallbackIcon()
  try {
    // Reuse existing artwork caches, returning the extension that actually exists.
    const safeAppName = basename(appName)
    for (const extension of ['.png', '.jpg']) {
      const cached = join(iconsFolder, safeAppName + extension)
      if (await readIconFile(cached)) return cached
    }

    let image = gameInfo.art_square || ''
    if (gameInfo.runner === 'gog') {
      const installPath = gameInfo.install.install_path
      if (installPath) {
        for (const local of [
          join(installPath, `goggame-${safeAppName}.ico`),
          join(installPath, 'support', 'icon.png')
        ]) {
          if (await readIconFile(local)) return local
        }
      }
      // A store failure should still allow the game's ordinary artwork to work.
      try {
        const product = await withIconTimeout(
          libraryManagerMap.gog.getProductApi(appName)
        )
        if (product?.data.images?.icon)
          image = 'https:' + product.data.images.icon
      } catch {
        // Continue with art_square when offline or store metadata is unavailable.
      }
    }
    if (!image) return fallback
    image = image.replace('{ext}', 'jpg')
    if (isAbsolute(image) || image.startsWith('file:')) {
      const local = image.startsWith('file:') ? fileURLToPath(image) : image
      return (await readIconFile(local)) ? local : fallback
    }
    const key = createHash('sha256')
      .update(JSON.stringify([gameInfo.runner, appName, image]))
      .digest('hex')
    const output = join(iconsFolder, `artwork-${key}.png`)
    if (await readIconFile(output)) return output

    let decoded: Electron.NativeImage
    if (image.startsWith('data:image/')) {
      if (image.length > maxIconBytes) return fallback
      decoded = nativeImage.createFromDataURL(image)
    } else {
      const url = new URL(image)
      if (!['http:', 'https:'].includes(url.protocol)) return fallback
      const response = await axios.get<ArrayBuffer>(url.href, {
        responseType: 'arraybuffer',
        timeout: 10000,
        signal: AbortSignal.timeout(10000),
        maxContentLength: maxIconBytes,
        maxRedirects: 5
      })
      decoded = nativeImage.createFromBuffer(Buffer.from(response.data))
    }
    if (decoded.isEmpty()) return fallback
    // Shortcut icons need no more than 256 pixels; avoid large persistent artwork.
    await writeIconPng(
      output,
      decoded.resize({ width: 256, height: 256 }).toPNG()
    )
    return output
  } catch (error) {
    logWarning(
      ['Could not load shortcut artwork, using the default icon:', error],
      LogPrefix.Backend
    )
    return fallback
  }
}

async function getFallbackIcon(): Promise<string> {
  // /app (Flatpak) and temporary AppImage mounts are not persistent host paths.
  const output = join(iconsFolder, 'heroic-default.png')
  if (await readIconFile(output)) return output
  const bundled = await readIconFile(windowIcon)
  if (bundled) {
    try {
      await writeIconPng(output, bundled)
      return output
    } catch {
      // Even a read-only/full cache must not prevent shortcut creation.
    }
  }
  return 'application-x-executable'
}

async function withIconTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Shortcut metadata request timed out')),
          10000
        )
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export {
  createImage,
  downloadImage,
  removeImage,
  checkImageExistsAlready,
  getIcon
}
