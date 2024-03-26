import { isMac } from '../../../constants'
import * as axios from 'axios'
import { existsSync, statSync, unlinkSync } from 'graceful-fs'
import { spawnSync } from 'child_process'

import { VersionInfo, Type, type WineManagerStatus } from 'common/types'
import { extractFiles } from 'backend/utils'

interface fetchProps {
  url: string
  type: Type
  count: number
}

/**
 * Helper to fetch releases from given url.
 *
 * @param url url where to fetch releases from.
 * @param type type of the releases (wine, proton, ge, ...)
 * @param count number of releases to fetch
 * @returns * resolves with an array of {@link VersionInfo}
 *          * rejects with an {@link Error}
 */
async function fetchReleases({
  url,
  type,
  count
}: fetchProps): Promise<VersionInfo[]> {
  const releases: Array<VersionInfo> = []
  return new Promise((resolve, reject) => {
    axios.default
      .get(url + '?per_page=' + count)
      .then((data) => {
        for (const release of data.data) {
          const release_data = {} as VersionInfo
          release_data.version = type.includes('Wine')
            ? `Wine-${release.tag_name}`
            : `Proton-${release.tag_name}`
          release_data.type = type
          release_data.date = release.published_at.split('T')[0]
          release_data.disksize = 0

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

        // sort out specific versions like LoL or diablo wine
        const latest =
          releases.find((release) => /\d+-\d+$/.test(release.version)) ??
          releases[0]
        // add latest to list
        releases.unshift({
          version: `${latest.type}-latest`,
          type: latest.type,
          date: latest.date,
          download: latest.download,
          downsize: latest.downsize,
          disksize: latest.disksize,
          checksum: latest.checksum
        })

        resolve(releases)
      })
      .catch((error) => {
        reject(
          new Error(
            `Could not fetch available releases from ${url} with error:\n ${error}`
          )
        )
      })
  })
}

/**
 * Helper to unlink a file.
 *
 * @param filePath absolute path to file
 * @throws {@link Error}
 */
function unlinkFile(filePath: string) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  } catch {
    throw new Error(`Couldn't remove ${filePath}!`)
  }
}

/**
 * Helper to get disk space of installed version.
 *
 * @param folder absolute path to folder
 * @returns size of folder in bytes
 */
function getFolderSize(folder: string): number {
  const param = isMac ? '-sk' : '-sb'
  const { stdout } = spawnSync('du', [param, folder])
  const value = parseInt(stdout.toString())

  // on mac we get the size in kilobytes so we need to convert it to bytes
  return isMac ? value * 1024 : value
}

interface unzipProps {
  filePath: string
  unzipDir: string
  overwrite?: boolean
  onProgress: (state: WineManagerStatus) => void
  abortSignal?: AbortSignal
}

/**
 * Helper to unzip an archive via tar.
 *
 * @param filePath url of the file
 * @param unzipDir absolute path to the unzip directory
 * @defaultValue false
 * @param onProgress callback to get unzip progress
 * @returns resolves or rejects with a message
 */
async function unzipFile({
  filePath,
  unzipDir,
  onProgress
}: unzipProps): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!existsSync(filePath)) {
        reject(`Zip file ${filePath} does not exist!`)
      } else if (statSync(filePath).isDirectory()) {
        reject(`Archive path ${filePath} is not a file!`)
      } else if (!existsSync(unzipDir)) {
        reject(`Install path ${unzipDir} does not exist!`)
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: can't give error a type but it mostly a Error or SystemError
      reject(error.message)
    }

    extractFiles({ path: filePath, destination: unzipDir, strip: 1 })
      .then(() => {
        onProgress({ status: 'idle' })
        resolve(`Succesfully unzip ${filePath} to ${unzipDir}.`)
      })
      .catch((error) => {
        onProgress({ status: 'idle' })
        reject(`Unzip of ${filePath} failed with:\n ${error}!`)
      })

    onProgress({ status: 'unzipping' })
  })
}

export { fetchReleases, unlinkFile, getFolderSize, unzipFile }
