import { stat } from 'fs/promises'
import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import axios from 'axios'
import { protocol } from 'electron'
import { appFolder } from './constants/paths'
import { Readable, PassThrough } from 'stream'

const imagesCachePath = join(appFolder, 'images-cache')

export const initImagesCache = () => {
  // make sure we have a folder to store the cache
  if (!existsSync(imagesCachePath)) {
    mkdirSync(imagesCachePath)
  }

  // use a fake protocol for images we want to cache
  protocol.handle('imagecache', (request) => {
    return getImageFromCache(request.url, request.signal)
  })
}

const pending = new Map<string, Promise<void>>()

const getImageFromCache = async (url: string, abort: AbortSignal) => {
  const realUrl = decodeURIComponent(url.replace('imagecache://', ''))
  // digest of the image url for the file name
  const digest = createHash('sha256').update(realUrl).digest('hex')
  const cachePath = join(imagesCachePath, digest)

  if (
    !pending.has(digest) &&
    realUrl.startsWith('http') &&
    !(await stat(cachePath)
      .then((s) => s.isFile())
      .catch(() => false))
  ) {
    // if not found, download and stream
    const response = await axios<Readable>({
      method: 'get',
      url: realUrl,
      responseType: 'stream',
      signal: abort
    })
    let resolve: () => void
    pending.set(digest, new Promise((res) => (resolve = res)))
    const responseStream = new PassThrough()
    const fileStream = createWriteStream(cachePath)

    response.data.pipe(fileStream)
    response.data.pipe(responseStream)
    response.data.once('end', () => {
      resolve()
      pending.delete(digest)
    })
    const webStream = Readable.toWeb(responseStream)
    // @ts-expect-error It seems node web api gets confused here
    // as one prop is required in one variant and not another
    return new Response(webStream, {
      headers: { 'Content-Type': 'application/octet-stream' }
    })
  }
  await pending.get(digest)
  const webStream = Readable.toWeb(createReadStream(cachePath))
  // @ts-expect-error It seems node web api gets confused here
  // as one prop is required in one variant and not another
  return new Response(webStream, {
    headers: { 'Content-Type': 'application/octet-stream' }
  })
}
