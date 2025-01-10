import { existsSync, createWriteStream, mkdirSync } from 'graceful-fs'
import { createHash } from 'crypto'
import { join } from 'path'
import axios from 'axios'
import { protocol } from 'electron'
import { appFolder } from './constants'

const imagesCachePath = join(appFolder, 'images-cache')

export const initImagesCache = () => {
  // make sure we have a folder to store the cache
  if (!existsSync(imagesCachePath)) {
    mkdirSync(imagesCachePath)
  }

  // use a fake protocol for images we want to cache
  protocol.registerFileProtocol('imagecache', (request, callback) => {
    callback({ path: getImageFromCache(request.url) })
  })
}

const pending = new Map<string, Promise<void>>()

const getImageFromCache = (url: string) => {
  const realUrl = url.replace('imagecache://', '')
  // digest of the image url for the file name
  const digest = createHash('sha256').update(realUrl).digest('hex')
  const cachePath = join(imagesCachePath, digest)

  if (
    !existsSync(cachePath) &&
    realUrl.startsWith('http') &&
    !pending.has(digest)
  ) {
    // if not found, download in the background
    pending.set(
      digest,
      new Promise((res) => {
        axios
          .get(realUrl, { responseType: 'stream' })
          .then((response) => response.data.pipe(createWriteStream(cachePath)))
          .finally(() => {
            pending.delete(digest)
            res()
          })
      })
    )
  }

  return join(cachePath)
}
