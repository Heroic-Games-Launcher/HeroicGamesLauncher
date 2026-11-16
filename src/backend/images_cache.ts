import {
  existsSync,
  createWriteStream,
  mkdirSync,
  statSync,
  unlinkSync,
  rmSync
} from 'graceful-fs'
import { createHash } from 'crypto'
import { join } from 'path'
import axios from 'axios'
import { protocol } from 'electron'
import { appFolder } from './constants/paths'

const imagesCachePath = join(appFolder, 'images-cache')

const FAILED_MARKER_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CONCURRENT_DOWNLOADS = 6
const DOWNLOAD_SPACING_MS = 150

export const initImagesCache = () => {
  // make sure we have a folder to store the cache
  if (!existsSync(imagesCachePath)) {
    mkdirSync(imagesCachePath)
  }

  // use a fake protocol for images we want to cache
  protocol.handle('imagecache', (request) => {
    return getImageFromCache(request.url)
  })
}

const pending = new Map<string, Promise<boolean>>()
let activeDownloads = 0
const waitQueue: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
    activeDownloads++
    return
  }
  await new Promise<void>((res) => waitQueue.push(res))
  activeDownloads++
}

function releaseSlot(): void {
  activeDownloads--
  const next = waitQueue.shift()
  if (next) next()
}

function failedMarkerPath(digest: string): string {
  return `${join(imagesCachePath, digest)}.err`
}

function isRecentlyFailed(digest: string): boolean {
  const marker = failedMarkerPath(digest)
  if (!existsSync(marker)) return false
  try {
    const { mtimeMs } = statSync(marker)
    return Date.now() - mtimeMs < FAILED_MARKER_TTL_MS
  } catch {
    return false
  }
}

function markFailed(digest: string): void {
  try {
    createWriteStream(failedMarkerPath(digest)).end()
  } catch {
    // ignore — best-effort marker
  }
}

// Rate-limited, negatively-cached download
async function downloadImage(
  realUrl: string,
  digest: string
): Promise<boolean> {
  const marker = failedMarkerPath(digest)
  // Clean up a stale marker before a fresh attempt.
  if (existsSync(marker)) {
    try {
      unlinkSync(marker)
    } catch {
      // ignore
    }
  }
  const cachePath = join(imagesCachePath, digest)

  await acquireSlot()
  try {
    // small spacing to avoid bursts on the CDN
    await new Promise((r) => setTimeout(r, DOWNLOAD_SPACING_MS))

    const response = await axios({
      method: 'get',
      url: realUrl,
      responseType: 'stream',
      timeout: 15000
    })
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(cachePath)
      response.data.pipe(stream)
      stream.on('finish', () => resolve())
      stream.on('error', reject)
    })
    return true
  } catch {
    // Negative-cache this failure
    markFailed(digest)
    return false
  } finally {
    releaseSlot()
  }
}

const getImageFromCache = async (url: string): Promise<Response> => {
  const realUrl = decodeURIComponent(url.replace('imagecache://', ''))
  // digest of the image url for the file name
  const digest = createHash('sha256').update(realUrl).digest('hex')
  const cachePath = join(imagesCachePath, digest)

  // Serve from cache
  if (existsSync(cachePath)) {
    return new Response(join(cachePath))
  }

  // Not a downloadable URL
  if (!realUrl.startsWith('http')) {
    return new Response(join(cachePath), { status: 404 })
  }

  // Skip recently failed downloads
  if (isRecentlyFailed(digest)) {
    return new Response(join(cachePath), { status: 404 })
  }

  // Reuse in-flight download
  let pendingPromise = pending.get(digest)
  if (!pendingPromise) {
    pendingPromise = downloadImage(realUrl, digest).finally(() => {
      pending.delete(digest)
    })
    pending.set(digest, pendingPromise)
  }

  const ok = await pendingPromise
  if (ok && existsSync(cachePath)) {
    return new Response(join(cachePath))
  }
  // 404 triggers frontend fallback
  return new Response(join(cachePath), { status: 404 })
}

// Wipe all cached images
export function clearImagesCache(): void {
  if (!existsSync(imagesCachePath)) return
  try {
    rmSync(imagesCachePath, { recursive: true, force: true })
    mkdirSync(imagesCachePath)
  } catch {
    // ignore
  }
  pending.clear()
  waitQueue.length = 0
}

// Purge one cached image
export function removeImageFromCache(url: string): void {
  const digest = createHash('sha256').update(url).digest('hex')
  const cachePath = join(imagesCachePath, digest)
  if (existsSync(cachePath)) {
    try {
      unlinkSync(cachePath)
    } catch {
      // ignore
    }
  }
  const marker = `${cachePath}.err`
  if (existsSync(marker)) {
    try {
      unlinkSync(marker)
    } catch {
      // ignore
    }
  }
}
