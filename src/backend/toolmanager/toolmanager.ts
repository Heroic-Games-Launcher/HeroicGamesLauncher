import { LogPrefix, logWarning } from './../logger/logger'
import * as axios from 'axios'
import {
  ProgressInfo,
  Repositories,
  State,
  VersionInfo
} from '../../common/types/toolmanager'
import * as crypto from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync
} from 'graceful-fs'

import {
  WINEGE_URL,
  SODA_BOTTLES_URL,
  DXVK_URL,
  DXVK_ASYNC_URL,
  VKD3D_URL,
  DXVK_NVAPI_URL,
  PROTONGE_URL
} from './constants'

import {
  downloadFile,
  fetchReleases,
  getFolderSize,
  unlinkFile,
  unzipFile
} from './utils'

interface getVersionsProps {
  repositories?: Repositories[]
  count?: number
}

/**
 * Fetch all available releases for given {@link Repositories}.
 * If no repository is given, all {@link Repositories} are checked.
 * @param repositorys array of {@link Repositories}.
 * @defaultValue all {@link Repositories}
 * @param count max versions to fetch for each {@link Repository}
 * @defaultValue 100
 * @returns * resolves with an array of {@link VersionInfo}
 *          * rejects with an {@link Error}
 */
async function getAvailableVersions({
  repositories = [
    Repositories.WINEGE,
    Repositories.PROTONGE,
    Repositories.SODA_BOTTLES,
    Repositories.DXVK,
    Repositories.DXVK_ASYNC,
    Repositories.DXVK_NVAPI,
    Repositories.VKD3D
  ],
  count = 100
}: getVersionsProps): Promise<VersionInfo[]> {
  const releases: Array<VersionInfo> = []
  for await (const repo of repositories) {
    switch (repo) {
      case Repositories.WINEGE: {
        await fetchReleases({
          url: WINEGE_URL,
          type: 'Wine-GE',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositories.PROTONGE: {
        await fetchReleases({
          url: PROTONGE_URL,
          type: 'Proton-GE',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositories.SODA_BOTTLES: {
        await fetchReleases({
          url: SODA_BOTTLES_URL,
          type: 'Soda-Bottles',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(
              ...fetchedReleases.filter((release: VersionInfo) =>
                release.version.includes('soda')
              )
            )
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositories.DXVK: {
        await fetchReleases({
          url: DXVK_URL,
          type: 'DXVK',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositories.DXVK_ASYNC: {
        await fetchReleases({
          url: DXVK_ASYNC_URL,
          type: 'DXVK-Async',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositories.DXVK_NVAPI: {
        await fetchReleases({
          url: DXVK_NVAPI_URL,
          type: 'DXVK-NVAPI',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      case Repositories.VKD3D: {
        await fetchReleases({
          url: VKD3D_URL,
          type: 'VKD3D',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            throw error
          })
        break
      }
      default: {
        logWarning(
          `Unknown and not supported repository key passed! Skip fetch for ${repo}`,
          {
            prefix: LogPrefix.ToolManager
          }
        )
        break
      }
    }
  }
  return releases
}

interface installProps {
  versionInfo: VersionInfo
  installDir: string
  overwrite?: boolean
  onProgress?: (state: State, progress?: ProgressInfo) => void
  abortSignal?: AbortSignal
}

/**
 * Installs a given version to the given installation directory.
 *
 * @param versionInfo the version to install as {@link VersionInfo}
 * @param installDir absolute path to installation directory
 * @param overwrite allow overwriting existing version installation
 * @defaultValue false
 * @param onProgress callback to get installation progress
 * @defaultValue void
 * @returns * resolves with updated {@link VersionInfo} and the full installation
 *            directory
 *          * rejects with an {@link Error}
 */
async function installVersion({
  versionInfo,
  installDir,
  overwrite = false,
  onProgress = () => {
    return
  },
  abortSignal
}: installProps): Promise<{ versionInfo: VersionInfo; installDir: string }> {
  /*
   * VARIABLE DECLARATION
   */

  const tarFile =
    installDir + '/' + versionInfo.download.split('/').slice(-1)[0]
  const installSubDir = installDir + '/' + versionInfo.version
  const sourceChecksum = versionInfo.checksum
    ? (
        await axios.default.get(versionInfo.checksum, {
          responseType: 'text'
        })
      ).data
    : undefined

  const abortHandler = () => {
    const error = new Error(
      `Installation of ${versionInfo.version} was aborted!`
    )
    error.name = 'AbortError'
    unlinkFile(tarFile)
    if (existsSync(installSubDir)) {
      rmSync(installSubDir, { recursive: true })
    }

    throw error
  }

  /*
   * INSTALLATION PROCESS
   */

  // Check if installDir exist
  if (!existsSync(installDir)) {
    throw new Error(`Installation directory ${installDir} does not exist!`)
  } else if (!statSync(installDir).isDirectory()) {
    throw new Error(`Installation directory ${installDir} is not a directory!`)
  }

  if (!versionInfo.download) {
    // check versionInfo has download
    throw new Error(`No download link provided for ${versionInfo.version}!`)
  }

  // Check if it already exist
  if (existsSync(installSubDir) && !overwrite) {
    logWarning(
      `${versionInfo.version} is already installed. Skip installing! \n
      Consider using 'override: true if you wan't to override it!'`,
      {
        prefix: LogPrefix.ToolManager
      }
    )

    // resolve with disksize
    versionInfo.disksize = getFolderSize(installSubDir)
    return { versionInfo: versionInfo, installDir: installSubDir }
  }

  // remove tarFile if still exist
  unlinkFile(tarFile)

  // Download
  await downloadFile({
    url: versionInfo.download,
    downloadDir: installDir,
    downsize: versionInfo.downsize,
    onProgress: onProgress,
    abortSignal: abortSignal
  }).catch((error: string) => {
    if (error.includes('AbortError')) {
      abortHandler()
    }

    unlinkFile(tarFile)
    throw new Error(
      `Download of ${versionInfo.version} failed with:\n ${error}`
    )
  })

  // Check if download checksum is correct
  const fileBuffer = readFileSync(tarFile)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(fileBuffer)

  const downloadChecksum = hashSum.digest('hex')
  if (sourceChecksum) {
    if (!sourceChecksum.includes(downloadChecksum)) {
      unlinkFile(tarFile)
      throw new Error('Checksum verification failed')
    }
  } else {
    logWarning(
      `No checksum provided. Download of ${versionInfo.version} could be invalid!`,
      {
        prefix: LogPrefix.ToolManager
      }
    )
  }

  // Unzip
  try {
    mkdirSync(installSubDir)
  } catch (error) {
    unlinkFile(tarFile)
    throw new Error(`Failed to make folder ${installSubDir} with:\n ${error}`)
  }

  await unzipFile({
    filePath: tarFile,
    unzipDir: installSubDir,
    overwrite: overwrite,
    onProgress: onProgress,
    abortSignal: abortSignal
  }).catch((error: string) => {
    if (error.includes('AbortError')) {
      abortHandler()
    }

    rmSync(installSubDir, { recursive: true })
    unlinkFile(tarFile)
    throw new Error(
      `Unzip of ${tarFile.split('/').slice(-1)[0]} failed with:\n ${error}`
    )
  })

  // clean up
  unlinkFile(tarFile)

  // resolve with disksize
  versionInfo.disksize = getFolderSize(installSubDir)
  return { versionInfo: versionInfo, installDir: installSubDir }
}

export { getAvailableVersions, installVersion }
