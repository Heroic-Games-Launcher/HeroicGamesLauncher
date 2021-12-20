/**
 * @file  Defines functions to fetch, download or remove available
 *        wine-ge releases.
 */

import * as axios from 'axios'
import Store from 'electron-store'
import { existsSync, readFileSync, rmdirSync, unlinkSync } from 'graceful-fs'
import * as crypto from 'crypto'
import { WINEGE_URL } from './constants'
import { logError, logInfo } from '../logger'
import { WineGEInfo } from './types'
import { downloadFile, unzipFile } from '../utils'

const wineGEStore = new Store({
  cwd: 'store',
  name: 'winege'
})

/**
 * Fetches all available wine-ge releases.
 * @param count max releases to fetch for (default: 100)
 * @returns ReleaseData list of available releases
 */
async function fetchWineGEReleases(count = '100'): Promise<WineGEInfo[]> {
  const releases: WineGEInfo[] = []
  try {
    const data = await axios.default.get(WINEGE_URL + '?per_page=' + count)

    for (const release of data.data) {
      const release_data = {} as WineGEInfo
      release_data.version = release.tag_name
      release_data.date = release.published_at.split('T')[0]
      release_data.disksize = 0
      release_data.hasUpdate = false
      release_data.isInstalled = false

      for (const asset of release.assets) {
        if (asset.name.endsWith('sha512sum')) {
          release_data.checksum = asset.browser_download_url
        } else if (
          asset.name.endsWith('tar.gz') ||
          asset.name.endsWith('tar.xz')
        ) {
          release_data.download = asset.browser_download_url
          release_data.downsize = asset.size
        }
      }

      releases.push(release_data)
    }
  } catch (error) {
    logError(error)
    logError('Could not fetch available wine-ge versions.')
    return
  }

  logInfo('Updating wine-ge list')

  if (wineGEStore.has('winege')) {
    const old_releases = wineGEStore.get('winege') as WineGEInfo[]

    old_releases.forEach((old) => {
      const index = releases.findIndex((release) => {
        return release.version === old.version
      })

      if (index) {
        releases[index].installDir = old.installDir
        releases[index].isInstalled = old.isInstalled
        if (releases[index].checksum !== old.checksum) {
          releases[index].hasUpdate = true
        }
      } else {
        releases.push(old)
      }
    })

    wineGEStore.delete('winege')
  }

  wineGEStore.set('winege', releases)

  logInfo('wine-ge list updated')
  return releases
}

function unlinkFile(filePath: string) {
  try {
    unlinkSync(filePath)
    return true
  } catch (error) {
    logError(error)
    logError(`Failed to remove ${filePath}!`)
    return false
  }
}

async function installWineGE(
  release: WineGEInfo,
  onProgress = () => {
    return
  }
): Promise<boolean> {
  // Check if installDir exist
  if (!existsSync(release.installDir)) {
    logError(`Installation directory ${release.installDir} doesn't exist!`)
    return false
  }

  if (!release.download) {
    logError(`No download link provided for ${release.version}!`)
    return false
  }

  const wineDir = release.installDir + '/Wine-' + release.version
  const sourceChecksum = release.checksum
    ? (await axios.default.get(release.checksum, { responseType: 'text' })).data
    : undefined

  // Check if it already exist and updates are available
  if (existsSync(wineDir)) {
    if (!release.hasUpdate) {
      logInfo(`Wine-${release.version} already installed skip download.`)
      return true
    }
  }

  // Prepare destination where to download tar file
  const tarFile =
    release.installDir + '/' + release.download.split('/').slice(-1)[0]

  if (existsSync(tarFile)) {
    if (!unlinkFile(tarFile)) {
      return false
    }
  }

  // Download
  downloadFile(release.download, release.installDir, onProgress)
    .then((response: string) => {
      logInfo(response)
    })
    .catch((error: string) => {
      logError(error)
      logError(`Download of Wine-${release.version} failed!`)
      return false
    })

  // Check if download checksum is correct
  const fileBuffer = readFileSync(tarFile)
  const hashSum = crypto.createHash('sha256')
  hashSum.update(fileBuffer)

  const downloadChecksum = hashSum.digest('hex')
  logInfo(downloadChecksum)
  logInfo(sourceChecksum)
  if (!sourceChecksum.includes(downloadChecksum)) {
    logError('Checksum verification failed')
    unlinkFile(tarFile)
    return false
  }

  // Unzip
  if (existsSync(wineDir)) {
    try {
      rmdirSync(wineDir, { recursive: true })
    } catch (error) {
      logError(error)
      logError(`Failed to remove already existing folder ${wineDir}!`)
      return false
    }
  }

  unzipFile(tarFile, release.installDir, onProgress)
    .then((response: string) => {
      logInfo(response)
    })
    .catch((error: string) => {
      logError(error)
      logError(`Unzip of ${tarFile.split('/').slice(-1)[0]} failed!`)
      return false
    })

  // Clean up
  unlinkFile(tarFile)

  return true
}

export { installWineGE, fetchWineGEReleases }
