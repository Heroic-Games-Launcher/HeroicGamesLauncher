import { isMac } from '../../../constants'
import * as axios from 'axios'
import { existsSync, statSync, unlinkSync } from 'graceful-fs'
import { spawnSync, spawn } from 'child_process'
import { ProgressInfo, State, VersionInfo, Type } from 'common/types'

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

interface downloadProps {
  url: string
  downloadDir: string
  downsize: number
  onProgress: (state: State, progress?: ProgressInfo) => void
  abortSignal?: AbortSignal
}

/**
 * Helper to download a file via curl.
 *
 * @param url url of the file
 * @param downloadDir absolute path to the download directory
 * @param downsize needed to calculate download speed
 * @param onProgress callback to get download progress
 * @param abortSignal signal to abort spawn
 * @returns resolves or rejects with a message
 */
async function downloadFile({
  url,
  downloadDir,
  downsize,
  onProgress,
  abortSignal
}: downloadProps): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!existsSync(downloadDir)) {
        reject(`Download path ${downloadDir} does not exist!`)
      } else if (!statSync(downloadDir).isDirectory()) {
        reject(`Download path ${downloadDir} is not a directory!`)
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: can't give error a type but it mostly a Error or SystemError
      reject(error.message)
    }

    let percentage = 0
    const filePath = downloadDir + '/' + url.split('/').slice(-1)[0]
    const download = spawn('curl', ['-L', url, '-o', filePath, '-#'], {
      signal: abortSignal
    })

    const startTime = process.hrtime.bigint()

    // curl does somehow print on stderr
    // progress calculation is done on stderr
    download.stderr.on('data', function (stderr) {
      // get time
      const time = process.hrtime.bigint()

      // get info from curl output
      const newPercentage = parseInt(stderr.toString())

      // check if percentage is valid
      percentage =
        !isNaN(newPercentage) &&
        100 > newPercentage &&
        newPercentage > percentage
          ? newPercentage
          : percentage

      // calculate download speed
      const alreadyDonwloaded = (downsize * percentage) / 100
      const seconds = Number(time - startTime) / Math.pow(10, 9)
      const avgSpeed = alreadyDonwloaded / seconds

      // calculate eta
      const eta =
        percentage > 0 ? (100 * seconds) / percentage - seconds : seconds

      // Calculate avgSpeed
      onProgress('downloading', {
        percentage: percentage,
        avgSpeed: avgSpeed,
        eta: Math.ceil(eta)
      })
    })

    download.on('close', function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Download of ${url} failed with exit code:\n ${exitcode}!`)
      }

      resolve(`Succesfully downloaded ${url} to ${filePath}.`)
    })

    download.on('error', (error: Error) => {
      if (error.name.includes('AbortError')) {
        reject(error.name)
      } else {
        reject(`Download of ${url} failed with:\n ${error.message}!`)
      }
    })
  })
}

interface unzipProps {
  filePath: string
  unzipDir: string
  overwrite?: boolean
  onProgress: (state: State, progress?: ProgressInfo) => void
  abortSignal?: AbortSignal
}

/**
 * Helper to unzip an archive via tar.
 *
 * @param filePath url of the file
 * @param unzipDir absolute path to the unzip directory
 * @param overwrite allow overwriting existing unpacked files
 * @defaultValue false
 * @param onProgress callback to get unzip progress
 * @returns resolves or rejects with a message
 */
async function unzipFile({
  filePath,
  unzipDir,
  overwrite = false,
  onProgress,
  abortSignal
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

    let extension_options = ''
    if (filePath.endsWith('tar.gz')) {
      extension_options = '-zxf'
    } else if (filePath.endsWith('tar.xz')) {
      extension_options = '-Jxf'
    } else {
      reject(`Archive type ${filePath.split('.').pop()} not supported!`)
    }

    const args = [
      '--directory',
      unzipDir,
      '--strip-components=1',
      extension_options,
      filePath
    ]

    if (overwrite && !isMac) {
      args.push('--overwrite')
    }

    const unzip = spawn('tar', args, { signal: abortSignal })

    onProgress('unzipping')

    unzip.stdout.on('data', function () {
      onProgress('unzipping')
    })

    unzip.stderr.on('data', function (stderr: string) {
      onProgress('idle')
      reject(`Unzip of ${filePath} failed with:\n ${stderr}!`)
    })

    unzip.on('close', function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Unzip of ${filePath} failed with exit code:\n ${exitcode}!`)
      }

      resolve(`Succesfully unzip ${filePath} to ${unzipDir}.`)
    })

    unzip.on('error', (error: Error) => {
      if (error.name.includes('AbortError')) {
        reject(error.name)
      } else {
        reject(`Unzip of ${filePath} failed with:\n ${error.message}!`)
      }
    })
  })
}

export { fetchReleases, unlinkFile, getFolderSize, downloadFile, unzipFile }
